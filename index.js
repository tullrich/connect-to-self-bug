'use strict'

const libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const Multiplex = require('libp2p-multiplex')
const MulticastDNS = require('libp2p-mdns')
const SECIO = require('libp2p-secio')
const PeerInfo = require('peer-info')
const async = require('async')
const multiaddr = require('multiaddr')
const argv = require('yargs')
  .option('port', { default: 4043 }).argv

class Node extends libp2p {
  constructor (peerInfo, config) {
    const modules = {
      transport: [new TCP()],
      connection: {
        muxer: [Multiplex],
        crypto: [SECIO]
      },
      discovery: [new MulticastDNS(peerInfo, 'test.local')]
    }
    super(modules, peerInfo)
  }
}

var node;
async.waterfall([
  (cb) => PeerInfo.create(cb),
  (myPeerInfo, cb) => {
    console.log("PORT ", argv.port);
    let ma  = multiaddr('/ip4/0.0.0.0/tcp/' + argv.port).encapsulate('/ipfs/' + myPeerInfo.id.toB58String());
    myPeerInfo.multiaddrs.add(ma);
    node = new Node(myPeerInfo, argv)
    node.start((err) => cb(err, myPeerInfo));
  }
], (err, myPeerInfo) => {
  if (err) { throw err }
  console.log("This Peer ID: ", myPeerInfo.id.toB58String());

  node.on('peer:discovery', (peer) => {
    console.log('Discovered:', peer.id.toB58String())
    node.dial(peer, (err) => {});
  })

  node.on('peer:connect', (peer) => {
    console.log('Connection established to:', peer.id.toB58String())
  })

  node.on('peer:disconnect', (peer) => {
    console.log('Disconnected:', peer.id.toB58String())
  })
})
