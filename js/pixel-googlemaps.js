// ----------------------------------------------------------------------------
// THE PIXEL GOOGLE MAPS PLUGIN JS
// BY ED FRYER
// ED@THEPIXEL.NINJA
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// DEFINE OUR GOOGLE MAPS OBJECT
// ----------------------------------------------------------------------------

var pixelGoogleMap = {};

// ----------------------------------------------------------------------------
// ON DOC READY
// ----------------------------------------------------------------------------

jQuery(document).ready(function(){

	//handle the shortcode
	pixelGoogleMap.initShortcode();

	//handle the admin area
	pixelGoogleMap.initAdmin();

});

// ----------------------------------------------------------------------------
// HANDLE THE SHORTCODE
// ----------------------------------------------------------------------------

pixelGoogleMap.initShortcode = function(){

	//grab the map
    var $map = jQuery(".pixel-googlemap");
	if(!$map.length){
		return false;
	}

	//grab the options
	var options = window.pixel_googlemaps_options || false;
	if(!options){
		console.error("Error: No options found for pixel google map");
		return false;
	}

	//defaults
	var defaults = {
		zoom 	: 10,
		address : "Sheffield UK",
		markers : {}
	}
	options = jQuery.extend(defaults,options);

	//make sure zoom is a number
	options.zoom = parseInt(options.zoom);

	//if admin mode disable double click zoom
	if(options.admin){
		options.disableDoubleClickZoom = true;
	}

	//add the map styles
	options.styles = pixelGoogleMap.mapStyles;

	//draw the map
    pixelGoogleMap.draw($map,options,function(map){

        //drop the main marker
    	pixelGoogleMap.dropMarker(map,options,function(marker){
            //console.log(marker);
        });

		//save the holder
		map.holder = $map;

		//if in admin mode
		if(options.admin){
			//grab the admin area
			var admin = jQuery("#pixel-googlemap-options");
			//on click of map
			google.maps.event.addListener(map,"click",function(event){
				//get edit mode
				var editMode = admin.find("#edit-mode input:checked").val();
				if(editMode == "line"){
					pixelGoogleMap.addNewLine(map,event);
				}else{
	  				pixelGoogleMap.addNewMarker(map,event);
				}
			});
			//on double click of map
			$map.on("dblclick",function(event){
				var editMode = admin.find("#edit-mode input:checked").val();
				if(editMode == "line"){
					pixelGoogleMap.saveLine(map,event);
					return false;
				}
			});
		}

		//convert markers to array
		var markers = new Array();
		for(var key in options.markers){
			var marker = options.markers[key];
			marker.location = marker.location.split(",");
			marker.id		= key;
			markers.push(marker);
		}

		//convert lines to array
		var lines = new Array();
		for(var key in options.lines){
			var line = options.lines[key];
			line.id	 = key;
			lines.push(line);
		}

        //drop the custom markers
		pixelGoogleMap.markers = [];
        pixelGoogleMap.dropMarkers(map,markers,function(marker){
			//add label
			pixelGoogleMap.infoLabel(map,marker,marker.title);
		});

        //draw the custom lines
		pixelGoogleMap.lines 			= [];
		pixelGoogleMap.currentLinePath 	= [];
		pixelGoogleMap.currentLine 		= false;
        pixelGoogleMap.drawLines(map,lines,function(shape){
			//add label
			pixelGoogleMap.infoLabel(map,shape,line.title);
		});

    });

};

// ----------------------------------------------------------------------------
// SPECIFIC ADMIN AREA SCRIPTS
// ----------------------------------------------------------------------------

pixelGoogleMap.initAdmin = function(){

	//grab the admin area
	var admin = jQuery("#pixel-googlemap-options");

	//handle uploading images
	admin.on("click",".chooseImage",function(e){
	    e.preventDefault();
		var button 	= jQuery(this);
		var holder 	= jQuery(this).parents(".image");
		var input	= holder.find("input");
		var thumb	= holder.find(".thumbnail");
	    var custom_uploader = wp.media({
            title: "Choose Image",
            button: {
                text: "Upload Image"
            },
            multiple: false //Set this to true to allow multiple files to be selected
        })
        .on("select",function(){
            var attachment = custom_uploader.state().get("selection").first().toJSON();
			input.val(attachment.id);
			thumb.css("background-image","url("+attachment.url+")").removeClass("noImage");
        })
        .open();
	});

	//delete a marker
	var markers = admin.find("#markers");
	jQuery("body").on("click",".delete-marker",function(e){
		e.preventDefault();
		var marker 	= jQuery(this).parents(".marker");
		var id		= jQuery(this).attr("data-id");
		marker.remove();
		if(pixelGoogleMap.markers){
			jQuery.each(pixelGoogleMap.markers,function(i,marker){
				if(marker.id == id){
					marker.setMap(null);
				}
			});
		}
		if(!admin.find(".marker").length){
			markers.append("<p class='no-markers'>No custon markers found. Click on the map above to add one.</p>");
		}
	});

	//delete a line
	var lines = admin.find("#lines");
	jQuery("body").on("click",".delete-line",function(e){
		e.preventDefault();
		var line 	= jQuery(this).parents(".line");
		var id		= jQuery(this).attr("data-id");
		line.remove();
		if(pixelGoogleMap.lines){
			jQuery.each(pixelGoogleMap.lines,function(i,line){
				if(line.id == id){
					line.setMap(null);
				}
			});
		}
		pixelGoogleMap.currentLinePath 	= [];
		pixelGoogleMap.currentLine 		= false;
		if(!admin.find(".line").length){
			lines.append("<p class='no-lines'>No custon lines found. Click on the map above to add one.</p>");
		}
	});

};

// ----------------------------------------------------------------------------
// ADD A NEW MARKER
// ----------------------------------------------------------------------------

pixelGoogleMap.addNewMarker = function(map,event){

	//grab the marker holder
	var markers = jQuery("#pixel-googlemap-options #markers");

	//create id
	var id = Math.random();

	//remove no marker message
	markers.find(".no-markers").remove();

	//create the marker
	var marker = {
		title	 : "Custom Icon",
		location : [event.latLng.lat(),event.latLng.lng()],
		id		 : id
	}

	//drop the marker
	pixelGoogleMap.dropMarker(map,marker,function(m){

		//create the form field
		var form = jQuery("\
			<div class='input-holder marker'>\
				<div class='cell input'>\
					<input name='pixel_googlemap_markers["+id+"][title]' type='text' placeholder='Marker title' required='required'/>\
				</div>\
				<div class='cell input'>\
					<input name='pixel_googlemap_markers["+id+"][location]' type='text' readonly='true' placeholder='Location' required='required' value='"+event.latLng.lat()+","+event.latLng.lng()+"'/>\
				</div>\
				<div class='input-holder image'>\
					<div class='cell thumb'>\
						<div class='thumbnail noImage'></div>\
						<input name='pixel_googlemap_markers["+id+"][icon]' type='hidden' value=''/>\
					</div>\
					<div class='cell btn'>\
						<button class='chooseImage button-primary'>Upload Icon</button>\
					</div>\
				</div>\
				<div class='cell btn'>\
					<button class='button delete-marker' data-id='"+id+"'>Delete Marker</button>\
				</div>\
			</div>\
		");

		//add to the form
		markers.prepend(form);

	});

}

// ----------------------------------------------------------------------------
// ADD A NEW LINE/SHAPE
// ----------------------------------------------------------------------------

pixelGoogleMap.addNewLine = function(map,event){

	//create the line path
	var line = {
		lat	:	event.latLng.lat(),
		lng :	event.latLng.lng()
	};
	pixelGoogleMap.currentLinePath.push(line);

	//create the actual line
	var line = new google.maps.Polyline({
		path			: pixelGoogleMap.currentLinePath,
		geodesic		: true,
		strokeColor		: '#FF0000',
		strokeOpacity	: 1.0,
		strokeWeight	: 2
	});

	//clear the curtrent line if any
	if(pixelGoogleMap.currentLine && pixelGoogleMap.currentLine.setMap){
		pixelGoogleMap.currentLine.setMap(null);
	}

	//add the new line
	line.setMap(map);
	pixelGoogleMap.currentLine = line;

}

// ----------------------------------------------------------------------------
// DRAW MANY LINES/SHAPES
// ----------------------------------------------------------------------------

pixelGoogleMap.drawLines = function(map,lines,lineCallback){

	//loop the lines
	jQuery.each(lines,function(i,line){
		//create the actual shape
		var color = line.color || "FF0000";
		var shape = new google.maps.Polygon({
			paths			: JSON.parse(line.path),
			strokeColor		: "#"+line.color,
			strokeOpacity	: 0.8,
			strokeWeight	: 2,
			fillColor		: "#"+line.color,
			fillOpacity		: 0.35,
			id 				: line.id,
			title			: line.title
		});
		//add to the map
		shape.setMap(map);
		//add line to lines array
		pixelGoogleMap.lines.push(shape);
		if(typeof(lineCallback) == "function"){
			lineCallback(shape);
		}
	});

}

// ----------------------------------------------------------------------------
// SAVE A LINE/SHAPE
// ----------------------------------------------------------------------------

pixelGoogleMap.saveLine = function(map,event){

	//grab the line holder
	var lines = jQuery("#pixel-googlemap-options #lines");

	//create id
	var id = Math.random();

	//remove no marker message
	lines.find(".no-lines").remove();

	//remove current line
	if(pixelGoogleMap.currentLine){
		pixelGoogleMap.currentLine.setMap(null);
	}

	//create the line
	var line = {
		title	 : "Custom Icon",
		path 	 : JSON.stringify(pixelGoogleMap.currentLinePath),
		id		 : id,
		color	 : "FF0000"
	}

	//wipe current line
	pixelGoogleMap.currentLinePath 	= [];
	pixelGoogleMap.currentLine 		= false;

	//create the form field
	var form = jQuery("\
		<div class='input-holder line'>\
			<div class='cell input'>\
				<input name='pixel_googlemap_lines["+id+"][title]' type='text' placeholder='Line title' required='required'/>\
			</div>\
			<div class='cell input'>\
				<input name='pixel_googlemap_lines["+id+"][path]' type='text' readonly='true' placeholder='Location' required='required' value='"+line.path+"'/>\
			</div>\
			<div class='cell input'>\
				<input name='pixel_googlemap_lines["+id+"][color]' class='jscolor' type='text' placeholder='Color' required='required' value='"+line.color+"'/>\
			</div>\
			<div class='cell btn'>\
				<button class='button delete-line' data-id='"+id+"'>Delete Line</button>\
			</div>\
		</div>\
	");

	//add to the form
	lines.prepend(form);

	//re add the jscolor plugin
	var input = form.find(".jscolor").get(0);
	new jscolor(input);

	//draw the lines
	pixelGoogleMap.drawLines(map,[line]);

}

// ----------------------------------------------------------------------------
// INIT A GOOGLE MAP
// ----------------------------------------------------------------------------

pixelGoogleMap.init = function(initCallback){

    //if no google
    if(typeof(google) === "undefined"){
        //load script
        pixelGoogleMap.loadMapScript();
        //save callback
        pixelGoogleMap.queueCallback(initCallback);
        return false;
    }else{
        //if no google maps
        try{
            var test = new google.maps.Geocoder();
        }catch(e){
            //console.log(e);
            //load script
            pixelGoogleMap.loadMapScript();
            //save callback
            pixelGoogleMap.queueCallback(initCallback);
            return false;
        }
    }

    //if all good and loaded then simply run callback
    if(typeof(initCallback) == "function"){
        initCallback();
    }

};

// ----------------------------------------------------------------------------
// LOAD THE GOOGLE MAP SCRIPT
// ----------------------------------------------------------------------------

pixelGoogleMap.loadMapScript = function(){
    window.pixelGoogleMapScriptReady = pixelGoogleMap.mapScriptReady;
    clearTimeout(pixelGoogleMap.loadTimer);
    pixelGoogleMap.loadTimer = setTimeout(function(){
        jQuery.getScript("http://maps.googleapis.com/maps/api/js?sensor=false&libraries=geometry&callback=pixelGoogleMap.mapScriptReady");
    },100);
};

// ----------------------------------------------------------------------------
// QUEUE A CALLBACK FOR RUNNING ONCE MAPS IS LOADED
// ----------------------------------------------------------------------------

pixelGoogleMap.queueCallback = function(callback){

    //in no queue callback array the create
    if(!pixelGoogleMap.callbackQueue){
        pixelGoogleMap.callbackQueue = new Array();
    }

    //check if the callback is already queued and if not queue it
    if(jQuery.inArray(callback,pixelGoogleMap.callbackQueue) === -1){
        pixelGoogleMap.callbackQueue.push(callback);
        //console.log("adding");
    }else{
        //console.log("skipping already there");
    }

};

// ----------------------------------------------------------------------------
// ONCE THE MAP SCRIPT HAS LOADED
// ----------------------------------------------------------------------------

pixelGoogleMap.mapScriptReady = function(){

    //loop the queued callbacks and fire them off
    jQuery.each(pixelGoogleMap.callbackQueue,function(i,callback){
        callback();
        if(i == pixelGoogleMap.callbackQueue.length-1){
            pixelGoogleMap.callbackQueue = new Array();
        }
    });

};

// ----------------------------------------------------------------------------
// DRAW A MAP
// ----------------------------------------------------------------------------

pixelGoogleMap.draw = function(el,options,drawCallback){

	//if no el stop
	if(!el.length){
		console.error("Error: No element defined for map");
		return false;
	}

    //if no height set in css for the map
    var height = el.outerHeight();
    if(!height){
        el.css("height",500);
    }

    //make sure we have inited map lib
    pixelGoogleMap.init(function(){

		//set some defaults
		var defaults = {
			mapTypeId           : google.maps.MapTypeId.ROADMAP,
			zoom                : 10,
			backgroundColor     : "none",
			styles              : [{
				featureType : "poi",
				stylers     : [{visibility:"off"}]
			}]
		}

        //if simply having address as options
        if(typeof(options) == "string"){
			defaults.address = options;
			options = defaults;
        }else{
			//add options to defaults
			options = jQuery.extend(defaults,options);
		}

        //if already lat and lng
        if(options.location){

            //create location
            var location = new google.maps.LatLng(options.location[0],options.location[1]);

            //draw map
            draw(location);

        //else geocode
        }else{

            //geocode address
            pixelGoogleMap.geoCode(options.address,function(location,status){
                //draw map
                draw(location);
            });

        }

    });

    //draw map
    function draw(location){
        //create map
        options.center = location;
        var map = new google.maps.Map(el.get(0),options);
        //fix some styles that mess up the styling of google map
        el.addClass("pixelGoogleMapNinja").append("<style type='text/css'>.pixelGoogleMapNinja img { max-width:none; }</style>");
        //callback
        if(typeof(drawCallback) == "function"){
            drawCallback(map,el);
        }
    }

};

// ----------------------------------------------------------------------------
// GEOLOCATE AN ADDRESS
// ----------------------------------------------------------------------------

pixelGoogleMap.geoCode = function(address,geoCallback){

    //make sure we have inited map lib
    pixelGoogleMap.init(function(){

        //define geocoder
        var geocoder = new google.maps.Geocoder();

        //geocode address
        geocoder.geocode({"address":address},function(results,status){
            if(status == google.maps.GeocoderStatus.OK){
                if(typeof(geoCallback) == "function"){
                    geoCallback(results[0].geometry.location,"success");
                }
            }else{
                if(typeof(geoCallback) == "function"){
                    geoCallback(false,status);
                }
            }
        });

    });

};

// ----------------------------------------------------------------------------
// HANDLE DIRECTIONS
// ----------------------------------------------------------------------------

pixelGoogleMap.directions = function(map,options){

    //if passing a jquery object as the options
    if(options.selector){
        options = {
            form    : options,
            start   : map.center
        }
    }else{
        if(options.start === undefined){
            options.start = map.center;
        }
    }

    //make sure we have inited map lib
    pixelGoogleMap.init(function(){

        //create the directions service and renderer
        var directionsService = new google.maps.DirectionsService();
        var directionsDisplay = new google.maps.DirectionsRenderer();

        //associate the directions with our map
        directionsDisplay.setMap(map);

        //build the form
        var form = jQuery("\
            <form class='pixelGoogleMapNinjaForm form-inline' acion='' method='post'>\
                <div class='input-group'>\
                    <input class='form-control' type='text' name='origin' placeholder='Starting Address' required='required'/>\
                </div>\
                <div class='input-group'>\
                    <select class='form-control' name='travelmode'>\
                        <option value='DRIVING'>Driving</option>\
                        <option value='BICYCLING'>Cycling</option>\
                        <option value='TRANSIT'>Public Transport</option>\
                        <option value='WALKING'>Walking</option>\
                    </select>\
                </div>\
                <div class='input-group'>\
                    <button type='submit' class='btn btn-default btn-brand'>Get Directions</button>\
                </div>\
            </form>\
        ");

        //add the form to the page
        if(options.form.hasClass("pixelGoogleMapNinja")){
            options.form.after(form);
        }else{
            options.form.append(form);
        }

        //add the textual directions to a page
        if(options.directions){
            options.directions.addClass("pixelGoogleMapNinjaDirections");
        }else{
            options.directions = jQuery("<div class='pixelGoogleMapNinjaDirections'></div>");
            form.after(options.directions);
        }
        directionsDisplay.setPanel(options.directions.get(0));

        //on click of the submit button
        form.on("submit",function(e){
            e.preventDefault();
            var start = form.find("[name='origin']").val();
            var mode  = form.find("[name='travelmode']").val();
            //get the vals and render directions
            renderDirections({
                origin      : options.start,
                destination : form.find("[name='origin']").val(),
                travelMode  : google.maps.TravelMode[mode]
            });
        });

        //render the directions onto the map
        function renderDirections(request){
            directionsService.route(request,function(result,status){
                //console.log(result,status);
                if(status == google.maps.DirectionsStatus.OK){
                    options.directions.html("");
                    directionsDisplay.setDirections(result);
                }else{
                    options.directions.html("<div class='alert alert-danger'>Sorry, No results found.</div>");
                }
            });
        }

    });

};

// ----------------------------------------------------------------------------
// DROP A MARKER
// ----------------------------------------------------------------------------

pixelGoogleMap.dropMarker = function(map,options,markerCallback){

    //if simply having address as options
    if(typeof(options) == "string"){
        options = {
            title   : options,
            address : options,
            delay   : 1000
        };
        pixelGoogleMap.geoCode(options.address,function(location,status){
            options.location = location;
            drop();
        });
    }else{
        if(options.location === undefined){
            pixelGoogleMap.geoCode(options.address,function(location,status){
                options.location = location;
                drop();
            });
        }else{
            if(jQuery.isArray(options.location)){
                options.location = new google.maps.LatLng(options.location[0],options.location[1]);
            }else{
                options.location = new google.maps.LatLng(options.location.lat,options.location.lng);
            }
            drop();
        }
    }

	function loadIcon(callback){

		//the marker color
        var color = options.color || pixelGoogleMap.randomColor();

		callback = callback || function(){};

		if(options.icon){
			var image = new Image();
			image.onload = function(){
				var width 	= 40;
				var height 	= (image.naturalHeight/image.naturalWidth)*40;
				var icon = {
					url			: options.icon,
					scaledSize	: new google.maps.Size(width,height),
					origin		: new google.maps.Point(0,0),
					anchor		: new google.maps.Point(width/2,height)
				};
				callback(icon);
			}
			image.src = options.icon;
		}else{
			var icon = pixelGoogleMap.markerImage(color);
			callback(icon.image);
		}

	}

    function drop(){

		loadIcon(function(icon){

			//create the marker
	        var marker = new google.maps.Marker({
	            position : options.location,
	            title    : options.title,
	            icon     : icon || null,
				id		 : options.id || null
	            //shadow   : icon.shadow || null
	        });

			//save
			pixelGoogleMap.markers.push(marker);

	        //set marker animation to drop
	        marker.setAnimation(google.maps.Animation.DROP);

	        //create info window if needed
	        if(options.infoWindow){
	            pixelGoogleMap.infoWindow(map,marker,options,function(infoWindow){
	                marker.infoWindow = infoWindow;
	            });
	        }

	        //add marker to map
	        setTimeout(function(){
	            marker.setMap(map);
	            marker.dropped = true;
	            marker.options = options;
	            if(typeof(markerCallback) == "function"){
	                markerCallback(marker);
	            }
	        },options.delay);

		});

    }

};

// ----------------------------------------------------------------------------
// DROP SEVERAL MARKERS
// ----------------------------------------------------------------------------

pixelGoogleMap.dropMarkers = function(map,markers,markerCallback,markersCallback){

	//if no array stop
	if(!markers.length){
		return false;
	}

    //grab the first marker to drop
    var marker = markers.shift();

    //if the marker has been dropped then we are back at the beginning
    if(marker.dropped){
        if(typeof(markersCallback) == "function"){
            markersCallback(markers);
        }
        return false;
    }

    //start the drop loop
    pixelGoogleMap.dropMarker(map,marker,function(marker){
        markers.push(marker);
        pixelGoogleMap.dropMarkers(map,markers,markerCallback,markersCallback);
        if(typeof(markerCallback) == "function"){
            markerCallback(marker);
        }
    });

};

// ----------------------------------------------------------------------------
// CREATE A MARKER IMAGE
// ----------------------------------------------------------------------------

pixelGoogleMap.markerImage = function(pinColor){

    pinColor = pinColor.replace("#","");
    var pin = {
        image :
            new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|"+pinColor,
                new google.maps.Size(21,34),
                new google.maps.Point(0,0),
                new google.maps.Point(10,34)
            )
        ,
        shadow :
            new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_map_pin_shadow",
                new google.maps.Size(40,37),
                new google.maps.Point(0,0),
                new google.maps.Point(12,35)
            )
    };
    return pin;

};

// ----------------------------------------------------------------------------
// INFO WINDOW
// ----------------------------------------------------------------------------

pixelGoogleMap.infoWindow = function(map,marker,options,infoWindowCallback){

    //set the title
    var title = options.title || "";

    //set the content
    var content = options.content || "";

    //set the link text
    var linkText = options.linkText || "More";

    //set the link
    if(options.link){
        var link = "<a href='"+options.link+"' title='"+title+"' class='btn btn-default btn-brand infoButton'>"+linkText+"</a>";
    }else{
        var link = "";
    }

    //set the thumb
    if(options.thumb){
        var thumb = "<div class='infoThumb'><img src='"+options.thumb+"' alt='"+title+" thumb'/></div>";
    }else{
        var thumb = "";
    }

    //create the html
    var html = "\
        <div class='infoWindow'>\
            <h3 class='infoTitle'>"+title+"</h3>\
            "+thumb+"\
            <div class='infoContent'>"+content+"</div>\
            "+link+"\
        </div>\
    ";

    //create the info window
    var infowindow = new google.maps.InfoWindow({
        content     : html,
        maxWidth    : 300
    });

    //open the window on click
    google.maps.event.addListener(marker,"click",function(){
        if(pixelGoogleMap.curInfowindow){
            pixelGoogleMap.curInfowindow.close();
        }
        infowindow.open(map,marker);
        pixelGoogleMap.curInfowindow = infowindow;
    });

    //callback
    if(typeof(infoWindowCallback) == "function"){
        infoWindowCallback(infowindow);
    }

};

// ----------------------------------------------------------------------------
// INFO LABEL
// ----------------------------------------------------------------------------

pixelGoogleMap.infoLabel = function(map,element,title){

	//the label
	var label = map.holder.find(".infoLabel");
	if(!label.length){
		map.holder.append("<div class='infoLabel' style='display:none;'></div>");
		var label = map.holder.find(".infoLabel");
	}
	var showLabel = false;

	//on mouse enter
	google.maps.event.addListener(element,"mouseover",function(e){
		label.text(title).show();
		showLabel = true;
	});

	//on mouse move
	map.holder.on("mousemove",function(e){
		if(showLabel){
			label.css({
				position	: "absolute",
				top 		: (e.pageY-map.holder.offset().top)-(label.height()+10),
				left 		: (e.pageX-map.holder.offset().left)-(label.width()/2),
			});
		}
	});

	//on mouse leave
	google.maps.event.addListener(element,"mouseout",function(e){
		label.hide().text("");
		showLabel = false;
	});

};

// ----------------------------------------------------------------------------
// GET THE DISTANCE BETWEEN TWO MARKERS
// ----------------------------------------------------------------------------

pixelGoogleMap.distanceBetween = function(marker1,marker2){

    var pos1 = marker1.getPosition();
    var pos2 = marker2.getPosition();
    var dist = google.maps.geometry.spherical.computeDistanceBetween(pos1,pos2);
    return dist;

};

// ----------------------------------------------------------------------------
// GET A RANDOM COLOR
// ----------------------------------------------------------------------------

pixelGoogleMap.randomColor = function(){
    var color = "#"+Math.floor(Math.random()*16777215).toString(16);
    if(color.length == 6){
        color = color+"0";
    }
    return color;
};

// ----------------------------------------------------------------------------
// SET THE GOOGLE MAP STYLES
// ----------------------------------------------------------------------------

pixelGoogleMap.mapStyles = [{
	"featureType": "water",
	"elementType": "geometry",
	"stylers": [{
		"color": "#e9e9e9"
	}, {
		"lightness": 17
	}]
}, {
	"featureType": "landscape",
	"elementType": "geometry",
	"stylers": [{
		"color": "#f5f5f5"
	}, {
		"lightness": 20
	}]
}, {
	"featureType": "road.highway",
	"elementType": "geometry.fill",
	"stylers": [{
		"color": "#ffffff"
	}, {
		"lightness": 17
	}]
}, {
	"featureType": "road.highway",
	"elementType": "geometry.stroke",
	"stylers": [{
		"color": "#ffffff"
	}, {
		"lightness": 29
	}, {
		"weight": 0.2
	}]
}, {
	"featureType": "road.arterial",
	"elementType": "geometry",
	"stylers": [{
		"color": "#ffffff"
	}, {
		"lightness": 18
	}]
}, {
	"featureType": "road.local",
	"elementType": "geometry",
	"stylers": [{
		"color": "#ffffff"
	}, {
		"lightness": 16
	}]
}, {
	"featureType": "poi",
	"elementType": "geometry",
	"stylers": [{
		"color": "#f5f5f5"
	}, {
		"lightness": 21
	}]
}, {
	"featureType": "poi.park",
	"elementType": "geometry",
	"stylers": [{
		"color": "#dedede"
	}, {
		"lightness": 21
	}]
}, {
	"elementType": "labels.text.stroke",
	"stylers": [{
		"visibility": "on"
	}, {
		"color": "#ffffff"
	}, {
		"lightness": 16
	}]
}, {
	"elementType": "labels.text.fill",
	"stylers": [{
		"saturation": 36
	}, {
		"color": "#333333"
	}, {
		"lightness": 40
	}]
}, {
	"elementType": "labels.icon",
	"stylers": [{
		"visibility": "off"
	}]
}, {
	"featureType": "transit",
	"elementType": "geometry",
	"stylers": [{
		"color": "#f2f2f2"
	}, {
		"lightness": 19
	}]
}, {
	"featureType": "administrative",
	"elementType": "geometry.fill",
	"stylers": [{
		"color": "#fefefe"
	}, {
		"lightness": 20
	}]
}, {
	"featureType": "administrative",
	"elementType": "geometry.stroke",
	"stylers": [{
		"color": "#fefefe"
	}, {
		"lightness": 17
	}, {
		"weight": 1.2
	}]
}];
