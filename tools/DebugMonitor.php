<?php
ini_set('display_errors', 'On');
error_reporting(E_ALL ^ E_NOTICE);


function getDb() {

  try {
       $dbh = new PDO("pgsql:dbname=sharengo;host=localhost;port=5432", 'cs', 'gmjk51pa');
  } catch (PDOException $e) {
    echo "-1:Database error : $e";
  }

  return $dbh;

}


function getKm($dbh) {
  $stm = $dbh->prepare("select km from cars where plate='CSDEMO03'");
  $stm->execute();

  $result=$stm->fetchAll(PDO::FETCH_ASSOC);

  return $result[0]['km'];
}

function pushData($km) {
  $url = "http://core.sharengo.it:7600/notifies?plate=CSDEMO03&beaconText=";
  $beacon= JSON_decode('{"keyOn":false,"GearStatus":"N","KeyStatus":"OFF","VIN":"CSDEMO03","Km":0}');

  $beacon->Km = $km;

  $beaconText = JSON_encode($beacon);

  //echo($beaconText."\n");

  $beaconText = urlEncode($beaconText);

  $url = $url . $beaconText;

    //echo $url."\n";

    $ch = curl_init($url);
    curl_exec($ch);
    echo '\n';

}

function testData($km,$dbh) {
  $rkm = -1;
  $count= 0;
  while ($rkm != $km && ++$count<30) {
    sleep(1);
    $rkm = getKm($dbh);
    echo ("$count : Expected=$km  Read=$rkm\n");
  }

  return $count;

}


 $dbh = getDb();
 $dbh->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);


 $km=getKm($dbh)+1;
 echo ("KM: $km\n");

 pushData($km);
 $tries = testData($km,$dbh);

 if (tries>=30)
   exit(1);
 else
   exit(0);



?>


