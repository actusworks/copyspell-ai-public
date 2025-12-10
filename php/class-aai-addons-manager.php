<?php
// require this file from your main plugin bootstrap

class Copyspell_Addons_Manager {
    private $addon_dir;
    private $addon_url;
    private $option_license_key = 'copyspell_license_key';
    private $api_base = 'https://api.copyspell.ai'; // change to your API

    public function __construct() {
        $this->addon_dir = COPYSPELL_AI_PATH . 'addons/';
        $this->addon_url = plugins_url('addons/', dirname(__FILE__));
        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_assets']);
        add_action('wp_ajax_copyspell_install_addon', [$this, 'ajax_install_addon']);
        add_action('wp_ajax_copyspell_uninstall_addon', [$this, 'ajax_uninstall_addon']);
    }




    public function load_installed_addons() {
        
        // Load installed add-ons
        $addons = [];

        // Check for folder-based addons (new structure)
        foreach (glob($this->addon_dir . '*', GLOB_ONLYDIR) as $addon_folder) {
            $addon_name = basename($addon_folder);
            $js_file = $addon_folder . '/' . $addon_name . '.js';
            $php_file = $addon_folder . '/' . $addon_name . '.php';
            
            // Load JS module
            if (file_exists($js_file)) {
                $addons[] = $this->addon_url . $addon_name . '/' . $addon_name . '.js';
            }
            
            // Load PHP file
            if (file_exists($php_file)) {
                include_once $php_file;
            }
        }

        // Legacy: Check for root-level JS files (old structure)
        foreach (glob($this->addon_dir . '*.js') as $f) {
            $addons[] = $this->addon_url . basename($f);
        }
        foreach (glob($this->addon_dir . '*.php') as $php_file) {
            include_once $php_file;
        }

        return $addons;
    }

    public function enqueue_admin_assets($hook) {
        if ($hook !== 'toplevel_page_copyspell-addons') return;
        wp_enqueue_script('copyspell-addons-admin', plugins_url('../assets/js/copyspell-addons-admin.js', __FILE__), ['jquery'], filemtime(plugin_dir_path(__FILE__) . '../assets/js/copyspell-addons-admin.js'), true);
        wp_localize_script('copyspell-addons-admin', 'CopyspellAddonsConfig', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('copyspell_addons_nonce'),
            'addon_url_base' => $this->addon_url,
            'api_base' => $this->api_base,
            'license' => $this->get_stored_license()
        ]);
        wp_enqueue_style('copyspell-addons-admin-css', plugins_url('../assets/css/copyspell-addons-admin.css', __FILE__), [], filemtime(plugin_dir_path(__FILE__) . '../assets/css/copyspell-addons-admin.css'));
    }

    // AJAX actions -------------------------------------------------------



	// MARK: Install
	// ----------------------------------------------------------
    public function ajax_install_addon() {
		
		// Get add-on slug and base URL
		$addon = sanitize_text_field($_POST['addon']);
		$base_url = esc_url_raw($_POST['url']);

		if (!$addon || !$base_url) {
			wp_send_json_error('Missing parameters');
		}

		// Ensure base URL ends with /
		$base_url = trailingslashit($base_url);

		// First, fetch the manifest.json to get the list of files
		$manifest_url = $base_url . 'manifest.json';
		$manifest_response = wp_remote_get($manifest_url, ['timeout' => 20]);

		if (is_wp_error($manifest_response)) {
			wp_send_json_error('Failed to fetch manifest: ' . $manifest_response->get_error_message());
		}

		$manifest_body = wp_remote_retrieve_body($manifest_response);
		$manifest = json_decode($manifest_body, true);

		if (json_last_error() !== JSON_ERROR_NONE || !isset($manifest['files']) || !is_array($manifest['files'])) {
			wp_send_json_error('Invalid manifest format');
		}

		// Create addon directory
		$addon_target_dir = COPYSPELL_AI_PATH . 'addons/' . $addon . '/';
		
		if (!file_exists($addon_target_dir)) {
			wp_mkdir_p($addon_target_dir);
		}

		$installed_files = [];
		$errors = [];

		// Download each file from the manifest
		foreach ($manifest['files'] as $file_path) {
			$file_url = $base_url . $file_path;
			
			$response = wp_remote_get($file_url, ['timeout' => 20]);

			if (is_wp_error($response)) {
				$errors[] = "Failed to download: {$file_path}";
				continue;
			}

			$contents = wp_remote_retrieve_body($response);

			if (empty($contents)) {
				$errors[] = "Empty file: {$file_path}";
				continue;
			}

			// Create subdirectory if needed
			$local_file_path = $addon_target_dir . $file_path;
			$local_dir = dirname($local_file_path);
			
			if (!file_exists($local_dir)) {
				wp_mkdir_p($local_dir);
			}

			// Save file
			$written = file_put_contents($local_file_path, $contents);

			if (!$written) {
				$errors[] = "Could not write: {$file_path}";
				continue;
			}

			$installed_files[] = $file_path;
		}

		if (empty($installed_files)) {
			wp_send_json_error('No files were installed. Errors: ' . implode(', ', $errors));
		}

		// Read meta from main JS file
		$main_js = $addon_target_dir . $addon . '.js';
		$meta = file_exists($main_js) ? $this->read_addon_meta($main_js) : null;
		
		if (!$meta) {
			$meta = ['name' => $addon];
		}

		$result = [
			'message' => 'Installed',
			'path' => $addon_target_dir,
			'meta' => $meta,
			'files' => $installed_files
		];

		if (!empty($errors)) {
			$result['warnings'] = $errors;
		}

		wp_send_json_success($result);
	}




    // MARK: Uninstall
    // ----------------------------------------------------------
    public function ajax_uninstall_addon() {
        check_ajax_referer('copyspell_ai_admin_nonce', 'nonce');
        if (!current_user_can('manage_options')) wp_send_json_error('permission');

        $addon = sanitize_text_field($_POST['addon'] ?? '');
        if (empty($addon)) wp_send_json_error('missing');

        // Check for folder-based addon first (new structure)
        $folder_path = $this->addon_dir . $addon . '/';
        if (is_dir($folder_path)) {
            if ($this->delete_directory($folder_path)) {
                wp_send_json_success(['message' => 'Removed']);
            } else {
                wp_send_json_error('remove_failed');
            }
        }

        // Fall back to legacy single JS file
        $path = $this->addon_dir . $addon . '.js';
        if (!file_exists($path)) wp_send_json_error('not_found');

        if (!@unlink($path)) wp_send_json_error('remove_failed');
        wp_send_json_success(['message' => 'Removed']);
    }

    /**
     * Recursively delete a directory and its contents
     */
    private function delete_directory($dir) {
        if (!is_dir($dir)) {
            return false;
        }
        
        $files = array_diff(scandir($dir), ['.', '..']);
        
        foreach ($files as $file) {
            $path = $dir . $file;
            if (is_dir($path)) {
                $this->delete_directory($path . '/');
            } else {
                @unlink($path);
            }
        }
        
        return @rmdir($dir);
    }

 
    
    // helper to extract a simple meta JS comment at the top of the file
    private function read_addon_meta($path) {
        $head = file_get_contents($path, false, null, 0, 1024); // read first 1KB
        if (preg_match('#/\*\s*META:\s*(\{.*?\})\s*\*/#s', $head, $matches)) {
            $json = $matches[1];
            $data = json_decode($json, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                return $data;
            }
        }
        return null;
    }
}

new Copyspell_Addons_Manager();



