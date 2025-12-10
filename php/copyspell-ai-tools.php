<?php




if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly








// MARK: allowed
// ----------------------------------------------------------
// This function checks if the current user is allowed to access.
// ----------------------------------------------------------
function copyspell_ai_allowed(){
	
	if (current_user_can('administrator') ||
		current_user_can('editor') ||
		current_user_can('shop_manager')) {
		return true;
	}
	return false;
}














