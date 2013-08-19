/**
 * Demonstrates multi label classification - zero or more classes per sample
 * 
 * @author Erel Segal-Halevi
 * @since 2013-08
 */


console.log("Multi-Label Classification demo start");

var classifiers = require('../../machine-learning/classifiers');
var mlutils = require('../../machine-learning/utils');
var fs = require('fs');
var _ = require('underscore')._;

var BinaryRelevanceClassifier = new classifiers.BinaryClassifierSet({
	'binaryClassifierType': classifiers.Winnow,
	'binaryClassifierOptions': {
		promotion: 1.5,
		demotion: 0.5,
		retrain_count: 10,
	},
});

var PassiveAggressiveClassifier = new classifiers.MultiLabelPassiveAggressive({
	Constant: 5.0,
	retrain_count: 10,
});

var classifier = BinaryRelevanceClassifier;

var explain=0;
var classes = ['A','B','C','D','E','F','G'];
var extra_features = {/*me:1, wants:1, the:1, and:1*/};
//var classes = ['1','2','3','4','5','6','7'];

// Create a training set - one class per sample   
var trainSet = classes.map(function(theClass) {
	var input = _(extra_features).clone();
	var theFeature = theClass+theClass;
	input[theFeature] = 1;
	var sample = {input: input, output: [theClass]};
	return sample;
});

fs.writeFileSync("./multilabel.train.arff", mlutils.toARFF(trainSet,"multilabel"));

// Create a test set - combinations of zero or more classes per sample
var testSet = [];
for (var numClasses=0; numClasses<classes.length; ++numClasses) {
	for (var iFirstClass=0; iFirstClass<(numClasses? classes.length: 1); ++iFirstClass) {
		var input = _(extra_features).clone();
		var output = [];
		for (var iClass=0; iClass<numClasses; ++iClass) {
			var theClass = classes[(iFirstClass+iClass)%classes.length];
			var theFeature = theClass+theClass;
			input[theFeature] = 1;
			output.push(theClass);
		}
		var sample={input:input, output:output};
		testSet.push(sample);
	}
}

fs.writeFileSync("./multilabel.test.arff", mlutils.toARFF(testSet,"multilabel"));

var explain = 0;
classifier.trainBatch(trainSet);
//console.dir(classifier);
//mlutils.testLite(classifier, testSet, explain);

/* run Clus on the arff files */
var sys = require('sys')
var exec = require('child_process').exec;
function puts(error, stdout, stderr) { sys.puts(stdout); sys.puts(stderr); }
exec("java -jar ~/Dropbox/Clus/Clus.jar ./multilabel.s", puts);

console.log("Multi-Label Classification demo end");

