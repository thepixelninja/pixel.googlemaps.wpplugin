<?php

/*
Plugin Name: Pixel Google Maps
Plugin URI: http://thepixel.ninja
Description: Adds ability to create google maps with customiseable markers and polylines
Author: Ed Fryer
Version: 1.0
Author URI: http://thepixel.ninja
*/

// ----------------------------------------------------------------------------
// The plugin class
// ----------------------------------------------------------------------------
class pixel_googlemaps {

	// ---------------------------------------------------------------------------
	// Set default vars
	// ---------------------------------------------------------------------------
	private $base;
	private $path;
	private $options;
	private $message;
	private $error;

	// ---------------------------------------------------------------------------
	// Kick it all off
	// ---------------------------------------------------------------------------
	public function __construct(){

		//work out the base path of the plugin
		$this->base = dirname(__FILE__);

		//work out the plugin path
		$this->path = plugins_url()."/pixel-googlemaps";

		//get the options
		//$this->delete_options();
		$this->options = $this->get_options();

		//listen for saving options
		if(isset($_POST["save_pixel_googlemap_options"])){
			$this->options = $this->save_admin_options();
		}

		//init the shortcode
		add_shortcode("pixel-googlemap",array($this,"shortcode"));

		//load the css
		add_action("wp_enqueue_scripts",array($this,"load_css"));
		add_action("admin_enqueue_scripts",array($this,"load_css"));

		//load the js
		add_action("wp_enqueue_scripts",array($this,"load_js"));
		add_action("admin_enqueue_scripts",array($this,"load_js"));

		//add admin menu page
		add_action("admin_menu",array($this,"admin_menu"));

		//add the tinyMCE shortcode button
		add_action("admin_init",array($this,"tiny_mce"));

	}

	// ---------------------------------------------------------------------------
	// Shortcode time
	// ---------------------------------------------------------------------------
	public function shortcode(){

		//grab the icon
		$options = $this->options;
		if($options["icon"] != ""){
			$options["icon"] = wp_get_attachment_url($options["icon"]);
		}

		//grab the marker icons
		foreach($options["markers"] as $key => $marker){
			if(isset($marker["icon"])){
				$options["markers"][$key]["icon"] = wp_get_attachment_url($marker["icon"]);
			}
		}

		//check if in admin mode
		if(is_admin()){
			$options["admin"] = true;
		}else{
			$options["admin"] = false;
		}

		//convert to json
		$json = json_encode($options);

		//add to page
		$js = "
			<script type='text/javascript'>
				window.pixel_googlemaps_options = $json;
			</script>
		";

		//add the map html
		$html = "<div class='pixel-googlemap'></div>";

		//echo it all out
		return $js.$html;

	}

	// ---------------------------------------------------------------------------
	// Kick off the TinyMCE buttons
	// ---------------------------------------------------------------------------
	public function tiny_mce(){

		if(current_user_can("edit_posts") && current_user_can("edit_pages") && get_user_option("rich_editing") == "true"){
			//add a callback to regiser our tinymce plugin
			add_filter("mce_external_plugins",array($this,"shortcode_button_js"));
			//add a callback to add our button to the TinyMCE toolbar
			add_filter("mce_buttons",array($this,"shortcode_button"));
		}

	}

	// ---------------------------------------------------------------------------
	// Add a shortcode button js to TinyMCE
	// ---------------------------------------------------------------------------
	public function shortcode_button_js(){

		return array(
			"pixel_googlemap_button" => $this->path."/js/pixel-googlemaps-tinyMCE.js"
		);

	}

	// ---------------------------------------------------------------------------
	// Add a shortcode button to TinyMCE
	// ---------------------------------------------------------------------------
	public function shortcode_button($buttons){

		$buttons[] = "pixel_googlemap_button";
		return $buttons;

	}

	// ---------------------------------------------------------------------------
	// Load the plugin js
	// ---------------------------------------------------------------------------
	public function load_js(){

		//register the js
		wp_register_script(
	        "pixel_googlemaps_js",
	        $this->path."/js/pixel-googlemaps.js",
	        array("jquery")
    	);
		wp_register_script(
	        "pixel_colorpicker_js",
	        $this->path."/js/jscolor.min.js"
    	);

		//add the scripts and css to the header
		wp_enqueue_script("pixel_googlemaps_js");
		wp_enqueue_script("pixel_colorpicker_js");

	}

	// ---------------------------------------------------------------------------
	// Load the plugin css
	// ---------------------------------------------------------------------------
	public function load_css(){

		//register the js
		wp_register_style(
	        "pixel_googlemaps_css",
	        $this->path."/css/pixel-googlemaps.css"
    	);

		//add the scripts and css to the header
		wp_enqueue_style("pixel_googlemaps_css");

	}

	// ---------------------------------------------------------------------------
	// Save the options posted from the admin form
	// ---------------------------------------------------------------------------
	public function save_admin_options(){

		$options = array();
		foreach($_POST as $key => $value){
            if($this->starts_with($key,"pixel_googlemap_")){
				$this->message = "Settings updated successfully.";
                $key = str_replace("pixel_googlemap_","",$key);
                $options[$key] = $value;
            }
        }
		if(!isset($options["markers"])){
			$options["markers"] = array();
		}
		if(!isset($options["lines"])){
			$options["lines"] = array();
		}
		$this->save_options($options);
		return $options;

	}

	// ---------------------------------------------------------------------------
	// Save the plugin options
	// ---------------------------------------------------------------------------
	public function save_options($options){

		//only allow admin to save
		if(!is_admin()){
			return false;
		}

		//serialise
		$options = serialize($options);

		//save to db
		update_option("pixel_googlemaps",$options);

	}

	// ---------------------------------------------------------------------------
	// Grab the plugin options
	// ---------------------------------------------------------------------------
	public function get_options(){

		//grab the options
		$options = get_option("pixel_googlemaps");

		//if no options then create
		if(!$options){
			$options = $this->create_options();
		}else{
			$options = unserialize($options);
		}

		return $options;

	}

	// ---------------------------------------------------------------------------
	// Create the plugin options
	// ---------------------------------------------------------------------------
	public function create_options(){

		$options = array(
			"icon"		=> "",
			"address"	=> "sheffield, england",
			"zoom"		=> "10",
			"markers" 	=> array(),
			"lines"		=> array()
		);
		$this->save_options($options);
		return $options;

	}

	// ---------------------------------------------------------------------------
	// Delete options
	// ---------------------------------------------------------------------------
	public function delete_options(){

		delete_option("pixel_googlemaps");

	}

	// ---------------------------------------------------------------------------
	// Add the menu item to the WP menu
	// ---------------------------------------------------------------------------
	public function admin_menu(){

		//add the admin page
		add_options_page(
			"Pixel Google Maps", 				//page title
			"Pixel Google Maps", 				//menu title
			"manage_options",	 				//capability
			"manage_pixel_googlemap_options",	//menu slug
			array(
				$this,
				"admin_page"
			)
		);

	}

	// ---------------------------------------------------------------------------
	// Build the admin page
	// ---------------------------------------------------------------------------
	public function admin_page(){

		//allow image upload
		wp_enqueue_media();

		$message = "";
		if($this->message){
			$message = "<div class='notice notice-success'><p>{$this->message}</p></div>";
		}

		$error = "";
		if($this->error){
			$message = "<div class='notice notice-error'>{$this->error}</div>";
		}

        $html = "
            <div id='pixel-googlemap-options' class='wrap'>
                <form method='post' action=''>
                    <h1>Pixel Google Map Options</h1>
                    <p>You can edit the custom options for your google map below.</p>
					$error
					$message
        ";

		$html .= $this->shortcode();

        $html .= $this->divider("Map Options");
		$html .= "
			<div class='input-holder' id='edit-mode'>
				<div class='cell label'>
					<label>Edit Mode:</label>
				</div>
				<div class='cell radio'>
					<input type='radio' id='marker-input' name='edit-mode' value='marker' checked='checked'/>
					<label for='marker-input'>Marker</label>
				</div>
				<div class='cell radio'>
					<input type='radio' id='line-input' name='edit-mode' value='line'/>
					<label for='line-input'>Line</label>
				</div>
			</div>
		";
        $html .= $this->input("Map Centre","address");
        $html .= $this->select("Map Zoom","zoom",array(1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20));
        $html .= $this->image("Map Icon","icon");

		//$this->debug($this->options);

		$html .= $this->divider("Markers");
		$html .= "<div id='markers'>";
		if(!empty($this->options["markers"])){
			foreach($this->options["markers"] as $key => $marker){
				$html .= "
					<div class='input-holder marker'>
						<div class='cell input'>
							<input name='pixel_googlemap_markers[$key][title]' type='text' placeholder='Marker title' required='required' value='{$marker["title"]}'/>
						</div>
						<div class='cell input'>
							<input name='pixel_googlemap_markers[$key][location]' type='text' readonly='true' placeholder='Location' required='required' value='{$marker["location"]}'/>
						</div>
						".$this->image("Marker Icon","markers[$key][icon]",false,$marker["icon"])."
						<div class='cell btn'>
							<button class='button delete-marker' data-id='$key'>Delete Marker</button>
						</div>
					</div>
				";
			}
		}else{
			$html .= "<p class='no-markers'>No custon markers found. Click on the map above to add one.</p>";
		}
		$html .= "</div>";

		$html .= $this->divider("Lines");
		$html .= "<div id='lines'>";
		if(!empty($this->options["lines"])){
			foreach($this->options["lines"] as $key => $line){
				$html .= "
					<div class='input-holder line'>
						<div class='cell input'>
							<input name='pixel_googlemap_lines[$key][title]' type='text' placeholder='Line title' required='required' value='{$line["title"]}'/>
						</div>
						<div class='cell input'>
							<input name='pixel_googlemap_lines[$key][path]' type='text' readonly='true' placeholder='Path' required='required' value='{$line["path"]}'/>
						</div>
						<div class='cell input'>
							<input name='pixel_googlemap_lines[$key][color]' class='jscolor' type='text' placeholder='Color' required='required' value='{$line["color"]}'/>
						</div>
						<div class='cell btn'>
							<button class='button delete-line' data-id='$key'>Delete Line</button>
						</div>
					</div>
				";
			}
		}else{
			$html .= "<p class='no-lines'>No custon lines found. Click on the map above to add one.</p>";
		}
		$html .= "</div>";
		//$html .= $this->input("Debug mode","debug_mode","checkbox");
		//$html .= $this->input("Textarea","textarea_example","textarea");
		//$html .= $this->select("Select","select_example",["option_1","option_2"]);

        $html .= $this->divider();
        $html .= "
                    <input type='submit' name='save_pixel_googlemap_options' value='Save Options' class='button button-primary'/>
                </form>
            </div>
        ";
        echo $html;

	}

	// ------------------------------------------------------------------------
    // Add some help text
    // ------------------------------------------------------------------------
    public function help($txt){

        $help = "
            <div class='help'>$txt</div>
        ";
        return $help;

    }

    // ------------------------------------------------------------------------
    // Create an input field or textarea
    // ------------------------------------------------------------------------
    public function input($placeholder,$name,$type="text",$required=false,$attrs=""){

		//check for saved value
		if(isset($this->options[$name])){
        	$value = $this->options[$name];
		}else{
			$value = "";
		}

		//set the name
        $name = "pixel_googlemap_$name";

		//default not checked
		$checked = "";

		//set hidden
		$hidden = "";

		//diff rules for diff inputs
		switch($type){

			case "checkbox":
				if($value && $value == "on"){
					$checked = "checked='checked'";
				}
				$hidden = "<input type='hidden' name='$name' value='off'/>";
			break;

			default:
				$val_attr = "";
				if($value){
					$value_attr = "value='$value'";
				}

		}

		//check if required
        if($required){
            $required = "required='required'";
        }else{
			$required = "";
		}

		//build the input
		if($type == "textarea"){
			$input = "
	            <div class='input-holder textarea'>
	                <label>$placeholder:</label>
	                <textarea name='$name' placeholder='$placeholder' $required $attrs>$value</textarea>
	            </div>
	        ";
		}else{
	        $input = "
	            <div class='input-holder'>
					<div class='cell label'>
		                <label>$placeholder:</label>
						$hidden
					</div>
					<div class='cell input'>
	                	<input type='$type' name='$name' $value_attr placeholder='$placeholder' $checked $required $attrs />
					</div>
	            </div>
	        ";
		}

        return $input;

    }

	// ---------------------------------------------------------------------------
	// Create an image upload field
	// ---------------------------------------------------------------------------
	public function image($placeholder,$name,$required=false,$value=""){

		//check for saved value
		if(isset($this->options[$name]) && $value == ""){
        	$value = $this->options[$name];
		}
		$value_attr = "value='$value'";

		//set the name
        $name = "pixel_googlemap_$name";

		//get the image
		$image = "";
		$class = "noImage";
		if($value){
			$class = "";
			$image = "style='background-image:url(".wp_get_attachment_url($value).");'";
		}

		//check if required
        if($required){
            $required = "required='required'";
        }else{
			$required = "";
		}

		//build the input
		$input = "
			<div class='input-holder image'>
				<div class='cell label'>
					<label>$placeholder:</label>
				</div>
				<!--<div class='cell input'>
					<input type='text' readonly='readonly' $value_attr placeholder='$placeholder' $required />
				</div>-->
				<div class='cell thumb'>
					<div class='thumbnail $class' $image></div>
					<input type='hidden' name='$name' $value_attr />
				</div>
				<div class='cell btn'>
					<button class='chooseImage button-primary'>Upload Icon</button>
				</div>
			</div>
		";

		return $input;

	}

	// ---------------------------------------------------------------------------
	// Create a select
	// ---------------------------------------------------------------------------
	public function select($placeholder,$name,$options=array(),$required=false,$attrs=""){

		//check for saved value
		if(isset($this->options[$name])){
        	$value = $this->options[$name];
		}else{
			$value = "";
		}

		//set the name
        $name = "pixel_googlemap_$name";

		//default not selected
		$checked = "";

		//handle the options
		$opts = array();
		foreach($options as $option){
			$selected = "";
			if($value == $option){
				$selected = "selected='selected'";
			}
			$readable = str_replace(array("-","_")," ",$option);
			$opts[] = "<option value='$option' $selected>$readable</option>";
		}
		$opts = implode("",$opts);

		//check if required
        if($required){
            $required = "required='required'";
        }else{
			$required = "";
		}

		$select = "
			<div class='input-holder'>
				<div class='cell label'>
					<label>$placeholder:</label>
				</div>
				<div class='cell select'>
					<select name='$name' $required $attrs>
						$opts
					</select>
				</div>
			</div>
		";

		return $select;

	}

    // ------------------------------------------------------------------------
    // Create a divider
    // ------------------------------------------------------------------------
    public function divider($title=false){

        $divider = "<div class='divider'>";
        if($title){
            $divider .= "<h3>$title</h3>";
        }
        $divider .= "<hr/></div>";
        return $divider;

    }

	// ------------------------------------------------------------------------
    // Check if a string starts with another
    // ------------------------------------------------------------------------
    public function starts_with($haystack,$needle){
        return $needle === "" || strrpos($haystack,$needle,-strlen($haystack)) !== false;
    }

	// ---------------------------------------------------------------------------
	// Debug
	// ---------------------------------------------------------------------------
	public function debug($debug){
		echo "<pre style='padding:10px; background:#000; color:#fff; width:100%;'>";
		print_r($debug);
		echo "</pre>";
		exit;
	}

}

// ----------------------------------------------------------------------------
// Kick it all off
// ----------------------------------------------------------------------------
$pixelGoogleMap = new pixel_googlemaps();

?>
