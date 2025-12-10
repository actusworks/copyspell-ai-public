<?php




if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly





function csai_log($message, $data = null) {
	
	if ( COPYSPELL_AI_MODE == 'DEV' ) {
		include_once __DIR__ . '/log_dev.php';
		csai_log_dev($message, $data);
		return;
	}
	
}