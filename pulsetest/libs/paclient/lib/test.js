const PAClient = require('./client');

const pa = new PAClient();
pa.on('ready', () => {
  console.log('Ready');
  pa.subscribe('all');
}).on('close', () => {
  console.log('Connection closed');
}).on('new', (type, index) => {
  pa[getFnFromType(type)](index, (err, info) => {
    if (err) {
      console.log(`Could not fetch ${type}, index ${index}: ${err.message}`);
      return;
    }
    var name = info.name || info.description || '<unknown>';
    console.log(`"${name}" (${type}) added`);
  });
}).on('change', (type, index) => {
  console.log('---------------------------------------')
  console.log(type)
  console.log(index)
  pa[getFnFromType(type)](index, (err, info) => {
    if (err) {
      console.log(`Could not fetch ${type}, index ${index}: ${err.message}`);
      return;
    }
    var name = info.name || info.description || '<unknown>';
    console.log(`"${name}" (${type}) changed`);
    console.log(info)
  });
}).on('remove', (type, index) => {
  console.log(`Removed ${type}, index #${index}`);
});

pa.connect();

function getFnFromType(type) {
  var fn;
  switch (type) {
    case 'sink':
    case 'card':
    case 'source': fn = type; break;
    case 'sinkInput':
    case 'sourceOutput':
    case 'client':
    case 'module': fn = `${type}ByIndex`; break;
    default:
      throw new Error('Unexpected type: ' + type);
  }
  return 'get' + fn[0].toUpperCase() + fn.slice(1);
}


setTimeout(() => {
  console.log('done')
}, 3000)
