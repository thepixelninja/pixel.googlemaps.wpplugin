jQuery(document).ready(function($) {

    tinymce.create("tinymce.plugins.pixel_googlemap_button", {

        init: function(ed,url){

            // Register command for when button is clicked
            ed.addCommand("pixel_googlemap_button",function(){

                selected = tinyMCE.activeEditor.selection.getContent();

                if (selected) {
                    //If text is selected when button is clicked
                    //Wrap shortcode around it.
                    content = "[pixel-googlemap]" + selected + "[/pixel-googlemap]";
                } else {
                    content = "[pixel-googlemap]";
                }

                tinymce.execCommand("mceInsertContent", false, content);

            });

			// Create images url
			var imagePath = url.split("/");
			imagePath[imagePath.length-1] = "images";
			imagePath = imagePath.join("/");

            // Register buttons - trigger above command when clicked
            ed.addButton("pixel_googlemap_button", {
                title	: "Insert pixel googlemap shortcode",
                cmd		: "pixel_googlemap_button",
                image	: imagePath+"/tiny-mce-button.png"
            });

        },
    });

    // Register our TinyMCE plugin
    // first parameter is the button ID1
    // second parameter must match the first parameter of the tinymce.create() function above
    tinymce.PluginManager.add("pixel_googlemap_button", tinymce.plugins.pixel_googlemap_button);

});
