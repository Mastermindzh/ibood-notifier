var copydir = require('copy-dir');
var path = require('path'); 

copydir(path.join(__dirname,'../src/images'), path.join(__dirname,'../lib/images'), function(err){
  if(err){
    console.log(err);
  } else {
    console.log('ok');
  }
});