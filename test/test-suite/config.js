'use strict';

const should = require('should');
const qcloud = require('../../index.js');
const config = qcloud.config;

describe('config.js', function () {
    it('should throw error when getting config which has falsy value', function () {
        config.setServerHost('');
        should.throws(function () {
           config.getServerHost();
        });

        config.setAuthServerUrl('');
        should.throws(function () {
           config.AuthServerUrl();
        });

        config.setTunnelServerUrl('');
        should.throws(function () {
           config.TunnelServerUrl();
        });

        config.setTunnelSignatureKey('');
        should.throws(function () {
           config.TunnelSignatureKey();
        });
    });

    it('should setup config successfully', function () {
       config.setServerHost('www.qcloud.la');
       config.getServerHost().should.be.equal('www.qcloud.la');

       config.setAuthServerUrl('http://127.0.0.1:9993/auth');
       config.getAuthServerUrl().should.be.equal('http://127.0.0.1:9993/auth');
    });

    it('should support setup multiple config simultaneously', function () {
       config({
            'TunnelSignatureKey': '9f338d1f0ecc37d25ac7b161c1d7bf72',
            'NetworkTimeout': 1000,
            'NotExists': 'whatever',
        });

       config.getTunnelSignatureKey().should.be.equal('9f338d1f0ecc37d25ac7b161c1d7bf72');
       config.getNetworkTimeout().should.be.equal(1000);

       should.throws(function () {
          config.getNotExists();
       });
    });

    it('should have no problem when pass no options to config function', function () {
       should.doesNotThrow(function () {
          config();
       });
    });
});