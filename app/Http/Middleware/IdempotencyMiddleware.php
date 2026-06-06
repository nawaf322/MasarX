<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * API Idempotency Middleware
 *
 * Clientes deben enviar el header: Idempotency-Key: <uuid-o-ref-unica>
 *
 * - Solo aplica a métodos mutantes: POST, PUT, PATCH, DELETE
 * - El header es OPCIONAL — sin él la petición se procesa normalmente
 * - Misma (organization_id + key): retorna la respuesta cacheada (HTTP 200/20x)
 * - Keys expiran automáticamente después de 24 horas (limpieza por comando)
 *
 * Ejemplo de uso:
 *   POST /api/v1/shipments
 *   Idempotency-Key: REF-2026-001-ORG5
 *
 * Segunda llamada con la misma key → devuelve la respuesta original sin crear duplicado.
 */
class IdempotencyMiddleware
{
    private const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
    private const KEY_TTL_HOURS    = 24;

    public function handle(Request $request, Closure $next): Response
    {
        // Solo aplica a métodos mutantes
        if (!in_array(strtoupper($request->method()), self::MUTATING_METHODS, true)) {
            return $next($request);
        }

        $idempotencyKey = $request->header('Idempotency-Key');

        // Si no viene el header, continúa normalmente (no obligatorio)
        if (!$idempotencyKey) {
            return $next($request);
        }

        // Validar formato del key (máx 255 chars)
        $idempotencyKey = substr(trim($idempotencyKey), 0, 255);
        if ($idempotencyKey === '') {
            return response()->json([
                'error' => 'Idempotency-Key header must not be empty.',
            ], 400);
        }

        $orgId = $request->user()?->organization_id;

        if (!$orgId) {
            // Sin organización — no podemos hacer scope; continuar sin idempotencia
            return $next($request);
        }

        // Buscar key existente para esta organización
        $existing = DB::table('idempotency_keys')
            ->where('organization_id', $orgId)
            ->where('key', $idempotencyKey)
            ->first();

        if ($existing) {
            // Respuesta ya generada — devolver cacheada
            $body = json_decode($existing->response_body, true) ?? [];

            return response()
                ->json($body, $existing->response_status)
                ->header('Idempotency-Key', $idempotencyKey)
                ->header('X-Idempotent-Replayed', 'true');
        }

        // Procesar la petición normalmente
        $response = $next($request);

        // Solo cachear respuestas exitosas (2xx) y errores de validación (422)
        // No cachear 5xx — pueden reintentarse
        $status = $response->getStatusCode();
        if ($status >= 200 && $status < 500) {
            try {
                // Limpiar keys expiradas ocasionalmente (probabilidad 5%)
                if (random_int(1, 20) === 1) {
                    $this->cleanExpiredKeys();
                }

                $responseBody = $response->getContent() ?: '{}';

                DB::table('idempotency_keys')->insertOrIgnore([
                    'organization_id' => $orgId,
                    'key'             => $idempotencyKey,
                    'method'          => strtoupper($request->method()),
                    'path'            => $request->path(),
                    'response_status' => $status,
                    'response_body'   => $responseBody,
                    'created_at'      => now(),
                ]);
            } catch (\Throwable $e) {
                // No interrumpir el flujo si falla el guardado de idempotencia
                Log::warning('[Idempotency] Failed to store key: ' . $e->getMessage(), [
                    'key'    => $idempotencyKey,
                    'org_id' => $orgId,
                ]);
            }
        }

        return $response->header('Idempotency-Key', $idempotencyKey);
    }

    private function cleanExpiredKeys(): void
    {
        DB::table('idempotency_keys')
            ->where('created_at', '<', now()->subHours(self::KEY_TTL_HOURS))
            ->delete();
    }
}
