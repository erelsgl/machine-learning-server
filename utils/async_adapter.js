var Redis = require('ioredis');
var client = new Redis(6379);
var async = require('async');
var _ = require('underscore')._;
var os = require("os");
var hostname = os.hostname();
//var wordNet = require('wordnet-magic')

// if (hostname == "te-srv4.cs.biu.ac.il")
	// var wn = wordNet("/mnt/ramdisk/wordnet/dict/sqlite-31.db", true)
// else
	// var wn = wordNet()

var NodeCache = require( "node-cache" );

//var wordnetcache = new NodeCache({'useClones': false});
//var wordnetcachecounter = 0
//var ppdbcache = new NodeCache({'useClones': false});
//var ppdbcachecounter = 0

function getembed(string, callback)
{
	client.select(10, function(err, response) {
		if (err) callback(err)

		client.get(string, function(err, results) {
			if (err) callback(err)

			callback(err, _.map(results.split(","), parseFloat))
		})
	})
}

function getppdbCache(string, pos, db, callback)
{
	ppdbcachecounter += 1
	if (ppdbcachecounter % 100000 == 0)
	{
		console.log("getppdbCache")
		console.log(JSON.stringify(ppdbcache.getStats(), null, 4))	
	}

	ppdbcache.get(string+"_"+pos+"_"+db, function(err, value){
  		if( _.isUndefined(value) ){
    			getppdb(string, pos, db, function(err, result){
    				ppdbcache.set(string+"_"+pos+"_"+db, result)
    				callback(null, result)
    			})
    	}
    	else
    		callback(null, value)

	})
}

function getppdb(string, pos, db, callback)
{	
	var output = []

	client.select(db, function(err, response) {
		if (err) callback(err)

		client.zrange(string, 0, -1, 'WITHSCORES', function(err, replies) {
			if (err) callback(err)

			_.each(replies, function(value, key, list){ 

				var wordpos = value.split("^")
				if (wordpos[1] = pos) 
					if (key % 2 == 0)
						output.push(wordpos[0])
			}, this)

			callback(err, _.uniq(output))
        })
	})	
}


function getwordnetCache(string, pos, relation, callback)
{
	wordnetcachecounter += 1 

	if (wordnetcachecounter % 100000 == 0)
	{
		console.log("wordnetcache")
		console.log(JSON.stringify(wordnetcache.getStats(), null, 4))	
	}


	wordnetcache.get(string+"_"+pos+"_"+relation, function(err, value){
  		if( _.isUndefined(value) ){
    			getwordnet(string, pos, relation, function(err, result){
    				wordnetcache.set(string+"_"+pos+"_"+relation, result)
    				callback(null, result)
    			})	
    	}
    	else
    		callback(null, value)
    	
	})
}

function synset2lemmas(synsets)
{
	var lemls = _.flatten(_.pluck(synsets, 'words'))
	var lemmas = _.pluck(lemls, 'lemma')
	return lemmas
}

function getwordnet(string, pos, relation, callbackg)
{
	if (_.isArray(relation))
	{
		console.log("Relation should not be a list")
		process.exit(0)
	}
	
	var POS = {

		'n': ['NN', 'NNS', 'NNP', 'NNPS', 'noun'],
		'a': ['JJ', 'JJR', 'JJS', 'adj'],
		's': ['JJ', 'JJR', 'JJS', 'adj'],
		'r': ['RB', 'RBR', 'RBS','WRB', 'adv'],
		'v': ['VB', 'VBD', 'VBG', 'VBN', 'VBP', 'VBZ', 'verb']
	}

	var gl_relations = ['synonym', 'hypernym', 'hypernym_1','hypernym_2','hypernym_3', 'hyponym', 'cohyponym']

	if (gl_relations.indexOf(relation) == -1)
	{
		console.log("Relation is not in the list")
		process.exit(0)
	}

	if (_.flatten(_.toArray(POS)).indexOf(pos) == -1)
	{
		console.log("err")
		process.exit(0)
	}

	var wnpos = ""

	_.each(POS, function(poslist, wnp, list){ 
		if (poslist.indexOf(pos) != -1)
			wnpos = wnp
	}, this)

	var word = new wn.Word(string, wnpos)

	if (relation == "synonym")
	{	
		word.getSynsets(function(err, synsets){
			var lemmas = synset2lemmas(synsets)
			callbackg(null, _.unique(lemmas))
        
		});
	}

	if (relation == "hypernym")
	{
		var output = []
		word.getSynsets(function(err, synsets){
			async.eachSeries(synsets, function(synset, callback1){ 
				synset.getHypernyms(function(err, hypernyms){
					output = output.concat(synset2lemmas(hypernyms))
        			callback1()
				})
    		}, function(err){
				callbackg(null, _.unique(output))
    		})
        })
	}
}
	


	// var output = []

	// async.waterfall([
	//     function(callback) {

	//     	var output = []
		
	//     	wordnet.lookup(string, function(results) {

	//     		_.each(results, function(value, key, list){
					
	// 				if (POS[value['pos']].indexOf(pos) != -1)
	// 					output.push(value) 

	// 			}, this)

	//     		callback(null, output)
	// 		})
	//     },
	//     function(results, callback) {

	//     	var output = []

	//     	if (relation.indexOf("_") != -1)
	//     	{
	//     		var list = relation.split("_")
	//     		var rel = list[0]
	//     		var count = list[1]
	//     		var ptrs = JSON.parse(JSON.stringify(results))

	//     		if (rel == "hypernym")
	//     		{
	// 	    		async.timesSeries(count, function(n, nextt){
	// 	    			var temp = []
		    			
	// 	    			async.eachSeries(ptrs, function(result, callback1){
							
	// 						output = output.concat(result['synonyms'])
		    				
	// 						async.eachSeries(result['ptrs'], function(res, callback4){

	// 							if (res['pointerSymbol'] == '@')
	// 							{

	// 								wordnet.get(res['synsetOffset'], res['pos'], function(subres) {
	// 									output = output.concat(subres['synonyms'])
	// 									temp.push(subres)
	// 									callback4()
	// 								})
	// 							}
	// 							else
	// 							callback4()

	// 						}, function(err, users) {
	// 							callback1()
	// 						})
	//     				}, function(err, users) {
	//     					ptrs = JSON.parse(JSON.stringify(temp))
	// 						nextt()
	// 					})
	//     			}, function(err, users) {
	// 					callback(null, _.unique(_.flatten(output)))	
	// 				})
	// 			}
	// 		}

	//     	if (relation == "synonym")
	//     	{
	// 			_.each(results, function(value, key, list){
	// 				output = output.concat(value['synonyms']) 
	// 			}, this)

	// 			callback(null, _.unique(output))
	//     	}

	//     	if (relation == "hypernym")
	//     	{
	//     		async.eachSeries(results, function(result, callback1){ 

	// 				async.eachSeries(result['ptrs'], function(res, callback2){

	// 					if (res['pointerSymbol'] == '@')
	// 					{
	// 						wordnet.get(res['synsetOffset'], res['pos'], function(subres) {
	// 							output = output.concat(subres['synonyms'])
	// 							callback2()
	// 						})
	//     				}
	//     				else
	//     				callback2()

	// 				}, function(err){ callback1() })
	// 			},  function(err){ callback(null, output) })
	// 		}

	// 		if (relation == "hyponym")
	//     	{
	//     		async.eachSeries(results, function(result, callback1){ 

	// 				async.eachSeries(result['ptrs'], function(res, callback2){

	// 					if (res['pointerSymbol'] == '~')
	// 					{
	// 						wordnet.get(res['synsetOffset'], res['pos'], function(subres) {
	// 							output = output.concat(subres['synonyms'])
	// 							callback2()
	// 						})
	//     				}
	//     				else
	//     				callback2()

	// 				}, function(err){ callback1() })
	// 			},  function(err){ callback(null, output) })
	// 		}

	//     	if (relation == "cohyponym")
	//     	{
			
	// 			async.eachSeries(results, function(result, callback1){ 

	// 				async.eachSeries(result['ptrs'], function(res, callback2){

	// 					if (res['pointerSymbol'] == '@')
	// 					{

	// 						wordnet.get(res['synsetOffset'], res['pos'], function(subres) {

	// 							async.eachSeries(subres['ptrs'], function(subsubres, callback3){
						
	// 								if (subsubres['pointerSymbol'] == '~')
	// 								{

	// 									wordnet.get(subsubres['synsetOffset'], subsubres['pos'], function(susubsubbres) {

	// 										output = output.concat(susubsubbres['synonyms'])
	// 										callback3()

	// 									})
	// 								}
	// 								else
	// 								callback3()

	// 							},  function(err){ callback2() })
	// 						})
	// 					}
	// 					else
	// 					callback2()			
			
	// 				}, function(err){ callback1() })

	// 			}, function(err){
				
	// 				callback(null, output)	
				
	// 			})

	//     	}
	// 	}
	// ], function (err, result) {

	// 	var result = _.map(_.unique(result), function(value){ return value.replace(/\_/g," "); });

	// 	callbackg(null, result)
	// })


function getred(params, db, callback)
{

	// var client = redis.createClient(6379)

// previouse dataset was 15
// 13 - 1098401 - context emb
// 14 - 173000 - word emb

	var output = {}

	async.mapSeries(params, function(word, callback){
		client.select(db, function(err, response) {
			client.get(word, function (err, response) {

				if (response == null)
				{
					output[word] = []
					callback(err, [])
				}
				else
				{
					var vec = _.compact(response.split(","))

					vec = _.map(vec, function(value){ return parseFloat(value); });

					output[word] = vec
					callback(err, vec)
				}
			})
		})	
	}, function(err, result) {

    	if (params.length != Object.keys(output).length)
    		throw new Error("Vectors should be of the same size")
		callback(err, output)
	})	
}

module.exports = {
  getppdb:getppdb,
  getwordnet:getwordnet,
  getred:getred,
  getwordnetCache:getwordnetCache,
  getppdbCache:getppdbCache,
  getembed:getembed
}
