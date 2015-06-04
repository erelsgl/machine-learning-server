var cluster = require('cluster');
var async = require('async')
var _ = require('underscore')._;
var fs = require('fs');
var wikipedia = require('./wikipedia');
var master = require('./master');
var partitions = require('limdu/utils/partitions');
var classifiers = require(__dirname+"/../classifiers.js")
var trainAndTest_async = require(__dirname+'/trainAndTest').trainAndTest_async;
var clc = require('cli-color')

var fold = process.env["fold"]
var datafilepath = process.env["datafile"]
var folds = process.env["folds"]
var classifier = process.env["classifier"]
var len = process.env["len"]
var thread = process.env["thread"]
var msg = clc.xterm(thread)

if (cluster.isWorker)
	console.log(msg("worker: started"))

var files = fs.readdirSync(datafilepath)

var dataset_global = {}

_.each(files, function(file, key, list){
	console.log(msg("worker "+process["pid"]+":loading "+file))
	dataset_global[file]= JSON.parse(fs.readFileSync(datafilepath+file))
}, this)

console.log(msg("worker "+process["pid"]+": dataset loaded"))

var classes = Object.keys(dataset_global)
var datasetsize = _.flatten(_.toArray(dataset_global)).length

var dataset = partitions.partitions_hash_fold(dataset_global, folds, fold)
console.log(msg("worker "+process["pid"]+": dataset partitioned"))

var train = dataset['train']
var test = dataset['test']

var index = 0

async.whilst(
    function () { return index <= train.length },
    function (callbackwhilst) {
       
       	index += (index < 20 ? 25 : 25)

       	var mytrainset = master.trainlen(train, index)
			
		async.timesSeries(len+1, function(n, callbacktime){

			n+=1
			
			console.log(msg("worker "+process["pid"]+": datasetsize="+datasetsize+" index=" + index +" alltrain="+_.flatten(train).length+" train="+mytrainset.length/classes.length+" testall="+test.length+" test="+test.length/classes.length +
				" length="+n+" maxlen="+len+" classifier="+classifier+" classes="+classes.length + " fold="+fold))

			var mytrain = master.filtrain(mytrainset, n, 0)
			var mytest = master.filtrain(test, n, 0)
			

		    trainAndTest_async(classifiers[classifier], mytrain, mytest, function(err, stats){

		    	console.log(msg("worker "+process["pid"]+": traintime="+stats['traintime']/1000 + " testtime="+ stats['testtime']/1000 + " classifier="+classifier))

				var results = {
					'classifier': classifier,
					'fold': fold,
					'trainsize': mytrainset.length/classes.length,
					'trainlen': n,
					'F1': stats['stats']['F1'],
					'macroF1': stats['stats']['macroF1'],
					'Accuracy': stats['stats']['Accuracy']
				}

				process.send(JSON.stringify(results))
				callbacktime()

		    	})

			  	}, function(){
			  		callbackwhilst()
			  	})
    },
    function (err) {
		console.log(msg("worker "+process["pid"]+": exiting"))
		process.exit()
	})
			  	
// fs.appendFileSync(statusfile, JSON.stringify(stat, null, 4))
// console.log(JSON.parse(cluster.worker.process.argv[3]))
// // console.log(cluster.worker.process.config)
// setTimeout(function() {
// process.send({ msg: 'test' })      
//     }, _.random(10)*1000);


