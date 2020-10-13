var apiKey = 'AIzaSyBpK48FTBTt7tG8DGAhA4O8PQb-dRsxY74';

var map;
var placeIdArray = [];
var locations =[];
let markers =[];
var parts = [];
var gRenderers = [];
var renderer;
var service;
var count = 0;
var delayFactor = 0;
//window.gRenderers = [];

function initialize() {
  var mapOptions = {
    zoom: 1,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    center: {lat: -33.8667, lng: 151.1955,}
  };
  /*
  var service = new google.maps.DirectionsService();
  if(renderer){
      renderer.setMap(null);
  }
  renderer = new google.maps.DirectionsRenderer();*/
  map = new google.maps.Map(document.getElementById('map'), mapOptions);
  window.gMap = map;
  var bounds = new google.maps.LatLngBounds();
/*
  var iconsetngs = {
    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW
    };
    var polylineoptns = {
        strokeOpacity: 0.8,
        strokeWeight: 3,
        strokeColor: '#4986E7',
    
        map: map,
        icons: [{
            repeat: '600px', //CHANGE THIS VALUE TO CHANGE THE DISTANCE BETWEEN ARROWS
            icon: iconsetngs,
            offset: '100%'
        }]
    };
*/
  // Adds a Places search box. Searching for a place will center the map on that
  // location.
  /*map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(
      document.getElementById('bar'));*/
  
  var autocomplete = new google.maps.places.Autocomplete(
      document.getElementById('autoc'));
  var infowindow = new google.maps.InfoWindow();
  var infowindowContent = document.getElementById("infowindow-content");
  infowindow.setContent(infowindowContent);    
  //autocomplete.bindTo('bounds', map);
  autocomplete.addListener('place_changed', function() {
      if (!infowindowContent){
        infowindow.close();
      }
    
    var place = autocomplete.getPlace();
    var coords = place.geometry.location;
    bounds.extend(coords);
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
    } /*else {
      map.setCenter(place.geometry.location);
      map.setZoom(17);
    }*/
    if(locations==null){
        locations=[];
    }
    if(parts == null){
        parts=[];
    }
    // Enables posibility of adding addresses for final route calculation
    document.getElementById("addLocation").addEventListener('click', (function(locations){
        console.log(locations.length);
        locations.push(coords);
    })(locations)); 
    console.log(locations);
    // slicing locations into multiple parts so that directions renderer can be applied to multiple locations
    for(var i=0, max= 25-1; i<locations.length; i= i+max){
        parts.push(locations.slice(i, i+max+1));
    }
    map.fitBounds(bounds);
    
    });
    function calculateRoute(){
          
        // output parts for debugging purposes
        console.log(parts);
        for (var i = 0; i < parts.length; i++) {
            // Waypoints does not include first station (origin) and last station (destination)
            var waypoints = [];
            for (var j = 1; j < parts[i].length-1; j++)
                waypoints.push({location: parts[i][j], stopover: false});

                /*if((j+1)<parts[i].length){
                    var src = parts[i][j];
                    var dest = parts[i][j+1];

                    var service_options = {
                        origin: src,
                        destination: dest,
                        travelMode: 'DRIVING'
                    };
                    m_get_directions_route(service_options);
                    
                }*/
            // Service options
            var service_options = {
                origin: parts[i][0],
                destination: parts[i][parts[i].length - 1],
                waypoints: waypoints,
                //optimizeWaypoints: true,
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
            renderer.setOptions({ suppressMarkers: true, preserveViewport: true });
            renderer.setDirections(response);
            // save renderer in variable gRenderers so that it can be used later
            gRenderers.push(renderer);
            console.log(renderer);
            /*
            //Initialize the Path Array
            var path = new google.maps.MVCArray();
            var poly = new google.maps.Polyline(polylineoptns);

            poly.setPath(path);

            for (var i = 0, len = response.routes[0].overview_path.length; i < len; i++) {
                path.push(response.routes[0].overview_path[i]);
            }
            */
          }
          else if(status == google.maps.DirectionsStatus.OVER_QUERY_LIMIT) {
              /*wait = true;
              setTimeout("wait = true", 2000);
              //alert("OQL: " + status);*/
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
        locations=[];
        parts=[];
        console.log(locations);
        console.log(parts);
        /*gRenderers.forEach(r=>{
            r.setMap(null);
        });*/
        //gRenderers = [];
        /*renderer.forEach(r=>{
            r.setDirections(null);
        });*/
        renderer.setMap(null);
        //renderer = null;
        //renderer = new google.maps.DirectionsRenderer();
        
    });

    // function to show and hide route line
    document.getElementById('showLine').addEventListener('click', function(){
        service = new google.maps.DirectionsService();
        renderer = new google.maps.DirectionsRenderer();
        renderer.setMap(map);
        calculateRoute();
        /*renderer.forEach(r => {
            console.log(r);
            r.setMap(map);
        });*/
    });
    document.getElementById('hideLine').addEventListener('click', function(){
        /*renderer.forEach(r => {
            console.log(r);
            r.setMap(null);
        });*/
        if(renderer){
            renderer.setMap(null);
        }
    });
    
}



$(window).load(initialize);