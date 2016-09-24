var async = require('async');

const translategoo = require('google-translate-api');
var microsoftT = require('mstranslator');

var fs = require('fs')
var keys = JSON.parse(fs.readFileSync(__dirname+"/keys.json"))

var yandex = require('yandex-translate')(keys.yandex); 
var microsoft = new microsoftT({
    client_id: "abcbcaacb", 
    client_secret: keys.microsoft
}, true);

var googleTranslate = require('google-translate')(keys.google);

console.vlog = function(data) {
  fs.appendFileSync("/tmp/logs/tran", data + '\n', 'utf8')
};

function translate(engine, fromln, toln, text, callback)
{
  var translated = ""
  console.vlog("DEBUGTRAN: inside: engine:"+engine+" fromln:"+fromln+" toln:"+toln+" text:"+text)
  async.series([
    function(callback){
        if(["yandex","Y","y"].indexOf(engine)!=-1) {
			    yandex.translate(text, { to: toln, from: fromln }, function(err, res) {
				    translated = res.text[0]
          	callback(null, null);
			});
	    } else {
          callback(null, null);
        }
    },
    function(callback){
        if(["microsoft", "M", "m"].indexOf(engine)!=-1) {
        	microsoft.translate({ text:  text, from: fromln, to: toln }, function(err, data) {
				translated = data
          		callback(null, null);
			});
        } else {
          callback(null, null);
        }
    },
  function(callback){

        if(["google", "g", "G"].indexOf(engine)!=-1) {

          var map = {
            "he": "iw",
            "zh": "zh-cn"
          }

          if (fromln in map) fromln = map[fromln]
          if (toln in map) toln = map[toln]
/*   
          googleTranslate.translate(text, fromln, toln, function(err, data) {
  				  console.log(err)
            console.log(data)
            translated = data.translatedText
            callback(null, null);
          });
*/
		      translategoo(text, {from: fromln, to: toln}).then(res => {
   			    console.log(res.text);
			      translated = res.text
			      callback(null, null);
	       	  }).catch(err => {
    		  	 console.error(err);
		        })
          } else {
            callback(null, null);
          }
    }
], function () {
    console.vlog("DEBUGTRAN: inside: "+translated)
    callback(null, translated)
})
}

/*
node utils/async_tran.js 'yandex' 'microsoft' 'de' 'I am starting doing stuff'
node utils/async_tran.js 'microsoft' 'microsoft' 'de' 'I am starting doing stuff'

*/

//var engine1 = process.argv[2]
//var engine2 = process.argv[3]
//var ln = process.argv[4]
//var text = process.argv[5]


function tran(engine1, ln, engine2, text, callback)
{
	console.log("DEBUGTRAN: engine1: "+engine1+ " engine2:"+ engine2+" ln:"+ln+" text:"+text)
	translate(engine1, 'en', ln, text, function(err, translated){
  		console.log("DEBUGTRAN: err: "+err+" to: "+translated) 
  		translate(engine2, ln, 'en', translated, function(err, result){
    			console.log(result)
			callback(null, result)
  		})
	})
}


module.exports = {
  tran:tran,
  translate:translate
}

