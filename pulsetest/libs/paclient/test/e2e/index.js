
import test from 'ava';

import pify from 'pify';

import PAClient from '../../';

const indexComparator = (a, b) => a.index - b.index;

test.beforeEach(async t => {
  const pa = new PAClient();
  const connect = () => {
    pa.connect();
    return new Promise(resolve => pa.once('ready', resolve));
  };

  pa.on('error', error => {
    console.error(error);
  });

  await connect();

  Object.assign(t.context, {
    pa: pify(pa),
    connect,
  });
});

test.afterEach(t => {
  const { pa } = t.context;
  pa.end();
});

test.serial('connection', t => {
  t.pass();
});

test.serial('moveSourceOutput (index, index)', async t => {
  const { pa } = t.context;

  const sourceOutputs = await pa.getSourceOutputs();
  const sourceOutput = sourceOutputs.find(so => so.sourceIndex >= 0);
  await pa.moveSourceOutput(sourceOutput.index, sourceOutput.sourceIndex);

  t.pass();
});

test.serial('moveSourceOutput (index, name)', async t => {
  const { pa } = t.context;

  const sourceOutputs = await pa.getSourceOutputs();
  const sources = await pa.getSources();
  const sourceOutput = sourceOutputs.find(so => so.sourceIndex >= 0);
  const source = sources.find(s => s.index === sourceOutput.sourceIndex);
  await pa.moveSourceOutput(sourceOutput.index, source.name);

  t.pass();
});

test.serial('setSinkPort (name, name)', async t => {
  const { pa } = t.context;

  const sinks = await pa.getSinks();
  const sink = sinks.find(s => s.ports.length > 0);
  if (!sink) {
    console.warn('setSinkPort test skipped');
    t.pass();
    return;
  }
  const { activePortName } = sink;
  await pa.setSinkPort(sink.name, activePortName);

  t.pass();
});

test.serial('setSinkPort (index, name)', async t => {
  const { pa } = t.context;

  const sinks = await pa.getSinks();
  const sink = sinks.find(s => s.ports.length > 0);
  if (!sink) {
    console.warn('setSinkPort test skipped');
    t.pass();
    return;
  }
  const { activePortName } = sink;
  await pa.setSinkPort(sink.index, activePortName);

  t.pass();
});

test.serial('setSinkPort (name, name) 2', async t => {
  const { pa } = t.context;

  const sinks = await pa.getSinks();

  const sink = sinks.find(s => s.ports.length > 1);
  const { activePortName } = sink;
  const inactivePort = sink.ports.find(p => p.name !== activePortName);

  await pa.setSinkPort(sink.name, inactivePort.name);

  t.is((await pa.getSink(sink.index)).activePortName, inactivePort.name);

  await pa.setSinkPort(sink.name, activePortName);

  t.is((await pa.getSink(sink.index)).activePortName, activePortName);
});

test.serial('setSourcePort (name, name)', async t => {
  const { pa } = t.context;

  const sources = await pa.getSources();
  const source = sources.find(s => s.ports.length > 0);
  if (!source) {
    console.warn('setSourcePort test skipped');
    t.pass();
    return;
  }
  const { activePortName } = source;
  await pa.setSourcePort(source.name, activePortName);

  t.pass();
});

test.serial('setSourcePort (index, name)', async t => {
  const { pa } = t.context;

  const sources = await pa.getSources();
  const source = sources.find(s => s.ports.length > 0);
  if (!source) {
    console.warn('setSourcePort test skipped');
    t.pass();
    return;
  }
  const { activePortName } = source;
  await pa.setSourcePort(source.index, activePortName);

  t.pass();
});

test.serial('setSourcePort (name, name) 2', async t => {
  const { pa } = t.context;

  const sources = await pa.getSources();

  const source = sources.find(s => s.ports.length > 1);
  const { activePortName } = source;
  const inactivePort = source.ports.find(p => p.name !== activePortName);

  await pa.setSourcePort(source.name, inactivePort.name);

  t.is((await pa.getSource(source.index)).activePortName, inactivePort.name);

  await pa.setSourcePort(source.name, activePortName);

  t.is((await pa.getSource(source.index)).activePortName, activePortName);
});

test.serial('loadModule + unloadModuleByIndex', async t => {
  const { pa } = t.context;

  const modulesBefore = (await pa.getModules()).sort(indexComparator);

  await pa.loadModule('module-null-sink', 'sink_name=paclient_test_sink');

  const modulesAfter = (await pa.getModules()).sort(indexComparator);
  const lastModule = modulesAfter[modulesAfter.length - 1];

  t.is(lastModule.name, 'module-null-sink');
  t.is(lastModule.args, 'sink_name=paclient_test_sink');

  await pa.unloadModuleByIndex(lastModule.index);

  const modulesAfterKill = (await pa.getModules()).sort(indexComparator);

  t.deepEqual(modulesAfterKill.length, modulesBefore.length);
});

test.serial('setSinkVolumes (index, volumes)', async t => {
  const { pa } = t.context;

  const sinks = await pa.getSinks();
  const sink = sinks.find(s => s.channelVolumes.length > 1);
  const newVolumes = sink.channelVolumes.map(v => v - 1);

  await pa.setSinkVolumes(sink.index, newVolumes);

  const sinksAfter = await pa.getSinks();
  const sinkAfter = sinksAfter.find(s => s.index === sink.index);

  t.deepEqual(sinkAfter.channelVolumes, newVolumes);
});

test.serial('setSinkInputVolumesByIndex (index, volumes)', async t => {
  const { pa } = t.context;

  const sinkInputs = await pa.getSinkInputs();
  const sinkInput = sinkInputs.find(s => s.channelVolumes.length > 1);
  const newVolumes = sinkInput.channelVolumes.map(v => v - 1);

  await pa.setSinkInputVolumesByIndex(sinkInput.index, newVolumes);

  const sinkInputsAfter = await pa.getSinkInputs();
  const sinkInputAfter = sinkInputsAfter.find(s => s.index === sinkInput.index);

  t.deepEqual(sinkInputAfter.channelVolumes, newVolumes);
});

test.serial('setCardProfile (index, name)', async t => {
  const { pa } = t.context;

  const cards = await pa.getCards();
  const [ card ] = cards;

  await pa.setCardProfile(card.index, card.activeProfileName);

  t.pass();
});

test.serial('getCard (index)', async t => {
  const { pa } = t.context;

  const cards = await pa.getCards();
  const [ card ] = cards;

  const card_ = await pa.getCard(card.index);

  t.deepEqual(card_, card);
});

test.serial('getServerInfo', async t => {
  const { pa } = t.context;

  const info = await pa.getServerInfo();

  t.truthy(info.defaultSinkName);
  t.truthy(info.defaultSourceName);
});
