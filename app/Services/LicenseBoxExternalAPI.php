<?php
namespace App\Services;
class LicenseBoxExternalAPI{private $a;private $b;private $c;private $d;private $e;private $f;private $g;private $h;
public function __construct(){$z=$this->_k();$this->a=$this->_r('An0jJgEIeAU=',$z);$this->b=$this->_r('X00VE0ADFhkAQVoKARgWFgwSVh0=',$z);$this->c=$this->_r('BQggUgsIDnBYAHUnJ1J8IVwlBXc=',$z);$this->d=$this->_r('UlcGD1pKUQ==',$z);$this->e='v1.0.0';$this->f=$this->_r('UlcXAkdW',$z);$this->g=365;$this->h=storage_path('app/.lic');}
private function _k(){return md5(substr(strrev(str_rot13(base64_encode(__CLASS__))),3,12).'_dpx_'.base64_decode('MjAyNA=='));}
private function _r($e,$k){$d=base64_decode($e);$r='';$l=strlen($k);for($i=0;$i<strlen($d);$i++){$r.=chr(ord($d[$i])^ord($k[$i%$l]));}return $r;}
public function check_local_license_exist(){return is_file($this->h);}
private function call_api($m,$u,$d=null){$x=curl_init();switch($m){case"POST":curl_setopt($x,CURLOPT_POST,1);if($d)curl_setopt($x,CURLOPT_POSTFIELDS,$d);break;case"PUT":curl_setopt($x,CURLOPT_CUSTOMREQUEST,"PUT");if($d)curl_setopt($x,CURLOPT_POSTFIELDS,$d);break;default:if($d)$u=sprintf("%s?%s",$u,http_build_query($d));}
$sn=getenv('SERVER_NAME')?:($_SERVER['SERVER_NAME']??null)?:getenv('HTTP_HOST')?:($_SERVER['HTTP_HOST']??'');
$hs=((isset($_SERVER['HTTPS'])&&$_SERVER['HTTPS']=="on")||(isset($_SERVER['HTTP_X_FORWARDED_PROTO'])&&$_SERVER['HTTP_X_FORWARDED_PROTO']==='https'))?'https://':'http://';
$su=$hs.$sn.($_SERVER['REQUEST_URI']??'/');
$ip=getenv('SERVER_ADDR')?:($_SERVER['SERVER_ADDR']??null)?:$this->get_ip_from_third_party()?:gethostbyname(gethostname());
curl_setopt($x,CURLOPT_HTTPHEADER,['Content-Type: application/json','LB-API-KEY: '.$this->c,'LB-URL: '.$su,'LB-IP: '.$ip,'LB-LANG: '.$this->d]);
curl_setopt($x,CURLOPT_URL,$u);curl_setopt($x,CURLOPT_RETURNTRANSFER,true);curl_setopt($x,CURLOPT_CONNECTTIMEOUT,30);curl_setopt($x,CURLOPT_TIMEOUT,30);
$r=curl_exec($x);$hs2=curl_getinfo($x,CURLINFO_HTTP_CODE);if(PHP_VERSION_ID<80500){curl_close($x);}
if(!$r){return json_encode(['status'=>false,'message'=>'Server is unavailable at the moment, please try again.']);}
if($hs2!=200){return json_encode(['status'=>false,'message'=>'Server returned an invalid response, please contact support.']);}
return $r;}
public function activate_license($l,$cl,$cr=true,$vt=null){$da=['product_id'=>$this->a,'license_code'=>$l,'client_name'=>$cl,'verify_type'=>$vt??$this->f];
$gd=$this->call_api('POST',$this->b.'api/activate_license',json_encode($da));$rp=json_decode($gd,true);
if(!empty($cr)&&is_array($rp)){if(!empty($rp['status'])){$lf=trim($rp['lic_response']??'');if($lf){@mkdir(dirname($this->h),0755,true);file_put_contents($this->h,$lf,LOCK_EX);}}else{@chmod($this->h,0777);if(is_file($this->h)&&is_writable($this->h)){unlink($this->h);}}}
return is_array($rp)?$rp:['status'=>false,'message'=>'Invalid response from license server.'];}
public function check_connection(){$gd=$this->call_api('POST',$this->b.'api/check_connection_ext');return json_decode($gd,true);}
private function get_ip_from_third_party(){try{$z=$this->_k();$x=curl_init();curl_setopt($x,CURLOPT_URL,$this->_r('X00VEwkWFl8RVFAJC09WABFJQ15XWQs=',$z));curl_setopt($x,CURLOPT_HEADER,0);curl_setopt($x,CURLOPT_RETURNTRANSFER,true);curl_setopt($x,CURLOPT_CONNECTTIMEOUT,5);curl_setopt($x,CURLOPT_TIMEOUT,5);$r=curl_exec($x);if(PHP_VERSION_ID<80500){curl_close($x);}return filter_var($r,FILTER_VALIDATE_IP)?$r:null;}catch(\Throwable $e){return null;}}}
