var cluster = require('cluster');
var async = require('async')
var _ = require('underscore')._;
var fs = require('fs');
// var wikipedia = require(__dirname + '/../utils/wikipedia');
var master = require('./master');
var classifiers = require(__dirname+"/../classifiers.js")
var trainAndTest = require(__dirname+'/../utils/trainAndTest');
var bars = require(__dirname+'/../utils/bars');
var util = require('util');

var fold = process.env["fold"]
// var folds = process.env["folds"]
var classifier = process.env["classifier"]
var thread = process.env["thread"]

var log_file = "./logs/" + process.pid
console.vlog = function(data) {
    fs.appendFileSync(log_file, data + '\n', 'utf8')
};

if (cluster.isWorker)
	console.vlog("DEBUG: worker "+ process.pid+": started")

	process.on('message', function(message) {
    console.vlog('DEBUG: worker ' + process.pid + ' received message from master.')
	
	var test  = bars.processdatasettest(JSON.parse(message['test']))
	var train = bars.processdatasettrain(JSON.parse(message['train']))

	_.each(train, function(turn, key, list){
		delete train[key]["input"]["sentences"]
	}, this)

	_.each(test, function(turn, key, list){
		delete test[key]["input"]["sentences"]
	}, this)

	// console.vlog("INITIALDIST: class: " + classifier + " DIST:"+JSON.stringify(bars.returndist(train), null, 4))	

	var max  = JSON.parse(message['max'])
	var max = 60

//	console.vlog("DEBUGWORKER: train.length before filter = "+train.length)
//      train = _.filter(train, function(num){ return _.keys(num.outputhash).length <= 1 })
//      console.vlog("DEBUGWORKER: train.length after filter = "+train.length)

	console.vlog("DEBUG: worker "+process.pid+" : train.length="+train.length + " test.length="+test.length + " max="+max + " classifier "+classifier)

	var index = 0

	async.whilst(
	    function () { return index < max },
	    function (callbackwhilst) {

			// var len = 5
//	       	index += (index < 20 ? 3 : 5)
		
		if (index<10)
		{
			index += 2
		} else if (index<20)
		{
			index += 10
		}
		else index += 10

//biased

//			index += 10

	       	var mytrain = bars.copyobj(train.slice(0, index))

	       	// var mytrainex = (bars.isDialogue(mytrain) ? _.flatten(mytrain) : mytrain)
	       	var mytrainex =  _.flatten(mytrain)
			// var mytestex  = (bars.isDialogue(test) ? _.flatten(test) : test)
			var mytestex  = _.flatten(test)

			/*if (classifier == "Biased_with_rephrase")
			{
				var ttrain = []
				console.vlog("PHRASES BEFORE:"+JSON.stringify(mytrainex.length, null, 4))
				_.each(mytrainex, function(value, key, list){
					ttrain.push(value)
					if ("rephrases" in value)
					{
						console.vlog("Add rephrase")
						ttrain = ttrain.concat(value["rephrases"])
					}
				}, this)
				mytrainex = bars.copyobj(_.flatten(ttrain))
				console.vlog("PHRASES AFTER:"+JSON.stringify(mytrainex.length, null, 4))
				console.vlog("PHRASES AFTER:"+JSON.stringify(bars.cleanoutput(mytrainex), null, 4))
			}
*/
			if (classifier == "Biased_no_rephrase_trans")
			{
				console.vlog("STARTTRAN")
				mytrainex = bars.gettrans(mytrainex, ".*:fi:.*")
				//mytrainex = bars.gettrans(mytrainex, ".*")
			}

/*			if (classifier == "Biased_without_rephrase")
			{
			//	var ttrain = bars.copyobj(mytrainex)
				_.each(mytrainex, function(value, key, list){
					delete value["rephrases"]
				}, this)
			//	mytrainex = bars.copyobj(_.flatten(ttrain))
			}
*/			
			// transform into one sentcen representation
			// filter labels
			// it's here because of recently added rephrases
			// mytrainex = bars.processdatasettrain(mytrainex)

			console.vlog("DEBUG: worker "+process["pid"]+": index=" + index +
				" train_dialogue="+mytrain.length+" train_turns="+mytrainex.length+
				" test_dialogue="+test.length +" test_turns="+mytestex.length+
				" classifier="+classifier+ " fold="+fold)

		    	// stats = trainAndTest_hash(classifiers[classifier], mytrainex, mytestex, false)

/*		    	if (classifier == "DS_primitive")
		    	{
		    		console.log("DEBUGWORKER: It's old fashion classifier, flatten the dataset")
		    		mytrainex = bars.flattendataset(mytrainex)
		    		mytestex = bars.flattendataset(mytestex)
		    	}
*/
			var realmytrainex = []

			if (classifier=="Oversampled") {
				var realmytrainex = bars.oversample(bars.copyobj(mytrainex))
			} else if (classifier=="Undersampled") {
				var realmytrainex = bars.undersample(bars.copyobj(mytrainex))
				
			} else {
				var realmytrainex = bars.copyobj(mytrainex)
				}
		
	//		console.log("DEBUGWORKER: mytrainex.length before filter = "+mytrainex.length)
	//		var realmytrainex = _.filter(mytrainex, function(num){ return _.keys(num.outputhash).length <= 1 })
	//		console.log("DEBUGWORKER: mytrainex.length after filter = "+realmytrainex.length)
	//		var mytrainex = bars.copyobj(realmytrainex)
	
			console.vlog("DIST: class: " + classifier + " DIST:"+JSON.stringify(bars.returndist(realmytrainex), null, 4))

			    if (index >= max)
        		        {
                        		if (classifier == "Undersampled")
                       		         fs.appendFileSync("./logs/under", JSON.stringify(bars.returndist(realmytrainex), null, 4), 'utf8')

	                        console.vlog("FINALE")
        		        }


		    	trainAndTest.trainAndTest_async(classifiers[classifier], bars.copyobj(realmytrainex), bars.copyobj(mytestex), function(err, stats){

		    		//var uniqueid = new Date().getTime()

			    	console.vlog("DEBUG: worker "+process["pid"]+": traintime="+
			    		stats['traintime']/1000 + " testtime="+ 
			    		stats['testtime']/1000 + " classifier="+classifier + 
			    		" Accuracy="+stats['stats']['Accuracy']+ " fold="+fold)

			    	console.vlog(JSON.stringify(stats['stats'], null, 4))

			    	var stats1 = {}
			    	_.each(stats['stats'], function(value, key, list){ 
			    		if ((key.indexOf("Precision") != -1) || (key.indexOf("Recall") != -1 ) || (key.indexOf("F1") != -1) || (key.indexOf("Accuracy") != -1))
			    			stats1[key] = value
			    	}, this)

				console.vlog("STATS: fold:"+fold+" trainsize:"+mytrain.length+" classifier:"+classifier+" "+JSON.stringify(stats1, null, 4))

					var results = {
						'classifier': classifier,
						'fold': fold,
						'trainsize': mytrain.length,
						'trainsizeuttr': realmytrainex.length,
						'stats': stats1
						// 'uniqueid': stats['id']
					}

					process.send(JSON.stringify(results))
			   		callbackwhilst()
			   	})
	    	},
    	function (err) {
			console.vlog("DEBUG: worker "+process["pid"]+": exiting")
			process.exit()
		})
			  	
	// fs.appendFileSync(statusfile, JSON.stringify(stat, null, 4))
	// console.log(JSON.parse(cluster.worker.process.argv[3]))
	// // console.log(cluster.worker.process.config)
	// setTimeout(function() {
	// process.send({ msg: 'test' })      
	//     }, _.random(10)*1000);

	});