var apiKey = 'AIzaSyBpK48FTBTt7tG8DGAhA4O8PQb-dRsxY74';

var map;
var placeIdArray = [];
var locations =[];
var all_locations = []; // to be stored in localStorage, for user to regain entered locations | won't get
                        // erased when new route is calculated
var markers =[];
var all_markers_position = []; // same as all_locations | can't save entire marker object
                               // so just position and total length will be saved
var parts = [];
var gRenderers = [];
var renderer;
var service;
var count = 0;
var delayFactor = 0;
var coords;
const image ="https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png"; //flag img for waypoints
//window.gRenderers = [];

function initialize() {
    
    if(localStorage.getItem("all_locations")!= null){
        locations = JSON.parse(localStorage.getItem("all_locations"));
        all_locations.push(...locations);
        var x = document.getElementById("previous-content"); // reminder for user that previous data can be shown
        x.style.display = "block";
        setTimeout(function () {   // timeout to automatically close the alert box
  
            // Closing the alert 
            $('#previous-content').slideUp(500); 
        }, 5000); 
    

    }
    if(localStorage.getItem("all_markers_position")!=null){
        all_markers_position = JSON.parse(localStorage.getItem("all_markers_position"));
    }

  var mapOptions = {
    zoom: 1,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    center: {lat: -33.8667, lng: 151.1955,}
  };

  map = new google.maps.Map(document.getElementById('map'), mapOptions);
  window.gMap = map;
  var bounds = new google.maps.LatLngBounds();
  var autocomplete = new google.maps.places.Autocomplete(
      document.getElementById('autoc'));
  var infowindow = new google.maps.InfoWindow();
  var infowindowContent = document.getElementById("infowindow-content");
  infowindow.setContent(infowindowContent);    
  autocomplete.addListener('place_changed', function() {
      if (!infowindowContent){
        infowindow.close();
      }
    
    place = autocomplete.getPlace();
    coords = place.geometry.location;
    bounds.extend(coords);
    if(locations == null){
        locations=[];
    }
    if(parts == null){
        parts=[];
    }
   
    map.fitBounds(bounds);
    
    });
     // Enables posibility of adding addresses when a user clicks a map location
     map.addListener('click', function(e){
         click_location = e.latLng;
         locations.push(click_location);
         console.log(all_locations); //debug
         all_locations.push(click_location);
         console.log(all_locations); //debug 
         localStorage.setItem('all_locations', JSON.stringify(all_locations));
         console.log(click_location, locations.length);
         place_marker(map,click_location);
     }); 
     // Enables posibility of adding addresses for final route calculation
     document.getElementById('addLocation').addEventListener('click', add_location, false); 

    function place_marker(map, location){
        var marker = new google.maps.Marker({
            position: location,
            map: map
        });
        markers.push(marker);
        all_markers_position.push(marker.position); // positions needed for markers reconstruction on page reload
        localStorage.setItem("all_markers_position", JSON.stringify(all_markers_position));
        localStorage.setItem("markers_length", JSON.stringify(markers.length));
        map.panTo(location);
    }
    
    function add_location(){
        if (place.geometry.viewport) {
            //map.fitBounds(place.geometry.viewport);
            var marker = new google.maps.Marker({
              position: coords,
              map:map,
            });
            google.maps.event.addListener(marker,"click", function(){
              infowindowContent.children.namedItem("place-name").textContent = place.name;
              infowindowContent.children.namedItem("place-address").textContent = place.formatted_address;
              infowindowContent.children.namedItem("place-id").textContent = place.place_id;  
              infowindow.open(map,marker);
              google.maps.event.addListener(map,"click", function(){
                  infowindow.close();
              });
            });
            markers.push(marker);
            all_markers_position.push(marker.position); // positions needed for markers reconstruction on page reload
            localStorage.setItem("all_markers_position", JSON.stringify(all_markers_position));
            localStorage.setItem("markers_length", JSON.stringify(markers.length));
            
          }

        console.log(locations.length);
        locations.push(coords);
        all_locations.push(coords);
        localStorage.setItem('all_locations', JSON.stringify(all_locations));
        //alert("Test successful");
    }(locations/*, all_locations*/);

    function calculateRoute(){
        
        console.log(locations);
        parts=[];
        // slicing locations into multiple parts so that directions renderer can be applied to multiple locations
        for(var i=0, max= 25-1; i<locations.length; i= i+max){
            parts.push(locations.slice(i, i+max+1));
        }
        var lastLocation = locations[locations.length-1];
        locations=[]; // empty locations so renderer won't have to calculate the route from the beggining
        locations.push(lastLocation); // add last location to start a new route with it
        // output parts for debugging purposes
        console.log(parts);
        for (var i = 0; i < parts.length; i++) {
            // Waypoints does not include first station (origin) and last station (destination)
            var waypoints = [];
            for (var j = 1; j < parts[i].length-1; j++)
                waypoints.push({location: parts[i][j], stopover: true});

            // Service options
            var service_options = {
                origin: parts[i][0],
                destination: parts[i][parts[i].length - 1],
                waypoints: waypoints,
                optimizeWaypoints: true,
                travelMode: 'DRIVING'
            };
            // Send request
            //service.route(service_options, service_callback);
            m_get_directions_route(service_options);
        }
    }
    
    function m_get_directions_route(service_options){
        service.route(service_options, function(response, status){
        if(status == "OK"){
            var iconsetngs = {
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                fillOpacity: 1,
                scale: 3
                };
            var polylineoptns = new google.maps.Polyline({ // never used, since somehow it only forks for last 2 locations
                fillOpacity: 1,
                strokeOpacity: 0.8,
                strokeWeight: 3,
                strokeColor: '#4986E7',
                icons: [{
                    repeat: '100px', //CHANGE THIS VALUE TO CHANGE THE DISTANCE BETWEEN ARROWS
                    icon: iconsetngs,
                    offset: '100%'
                }]
            });
            renderer = new google.maps.DirectionsRenderer({panel: document.getElementById('right-panel')});
            renderer.setOptions({ suppressMarkers: true, preserveViewport: true });
            renderer.setDirections(response);
                renderer.setMap(map); // adding this line enables route to be accesed on first press of "Show Line"
                console.log(renderer);

            // save renderer in variable gRenderers so that it can be used later
            gRenderers.push(renderer);
          }
          else if(status == google.maps.DirectionsStatus.OVER_QUERY_LIMIT) {
              delayFactor++;
              setTimeout(function () {
                  m_get_directions_route(service_options);
              }, delayFactor * 1000);
            }
          else if(status != "OK"){
              console.log('Directions request failed due to ' + status);
              return;
          } 
        });
    }    
    
    // Sets the map on all markers in the array.
    function setMapOnAll(map) {
        for (let i = 0; i < markers.length; i++) {
        markers[i].setMap(map);
        }
    };

    // Clear button. Click to remove all markers.
    document.getElementById('clear').addEventListener('click', function(event) {
        setMapOnAll(null);
        localStorage.removeItem('all_locations');
        localStorage.removeItem("all_markers_position");
        localStorage.removeItem("markers_length");
        markers=[];
        locations=[];
        all_markers_position=[];
        all_locations=[];
        parts=[];
        console.log(locations);
        console.log(parts);
        gRenderers.forEach(r=>{
            r.setMap(null);
        });
        gRenderers = [];  
    });

    // function to show and hide route line
    document.getElementById('showLine').addEventListener('click', function(){
        
        service = new google.maps.DirectionsService();
        var x = document.getElementById("previous-content"); // alert for existing previous data
        x.style.display = "none";
        var y = document.getElementById("render-status"); // alert for route rendering
        y.style.display = "block";
        setTimeout(function () {   // timeout to automatically close the alert box
  
            // Closing the alert 
            $('#render-status').slideUp(500); 
        }, 5000);

        calculateRoute();
        
        if( markers.length == 0){
            for(var i=0; i<JSON.parse(localStorage.getItem("markers_length"));i++){
                markers[i] = new google.maps.Marker({
                    position: all_markers_position[i],
                    map: map
                })
                bounds.extend(markers[i].position);
        }
            map.fitBounds(bounds);    
        }
        /*gRenderers.forEach(r => {
            console.log(r);
            r.setMap(map);
        });*/
        
        for(var m=1; m< markers.length-1; m++){ // modify markers, except first and last
            markers[m].setIcon(image);
            
        }
        
    });
    
    $("#route-alerts").height($("#previous-content").height()*2); // the div containing alerts has to keep constant height
                                                                  // in order for content to stay in place 
}



