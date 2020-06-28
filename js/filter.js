// Variables
//var regex = /Covid/i;
//var search = regex.exec(document.body.innerText);

// case insensitive contains
jQuery.expr[":"].icontains = jQuery.expr.createPseudo(function(arg) {
    return function( elem ) {
        return jQuery(elem).text().toLowerCase().indexOf(arg.toLowerCase()) >= 0;
    };
});


var trump_selector = ":icontains('trump')";

var covid_selector = ":icontains('covid'), :icontains('pandemic'), \
                     :icontains('cases'), :icontains('corona')";


function markElements(filter) {
   var selector = ""
   var color = ""
   if (filter == "covid") {
	   selector = covid_selector
	   color = "red"
   } else if (filter == "trump") {
	   selector = trump_selector
	   color = "orange"
   } else {
       // nothing
   }
   elements = $(selector).filter("h1,h2,h3,h4,h5,p,span,li");
   elements.css('background-color', color);
   return elements
}

//if (search) {
   chrome.storage.sync.get({
     filter: 'covid',
   }, function(items) {
       console.log("Filter setting stored is: " + items.filter);
	   elements = markElements(items.filter);
	   chrome.runtime.sendMessage(
            {method: "saveStats", marked: elements.length},
	        function(response) {
			      console.log("Logging " + elements.length + " marked.");
		 });
	 });
  chrome.runtime.sendMessage({}, function(response) {});
//}
