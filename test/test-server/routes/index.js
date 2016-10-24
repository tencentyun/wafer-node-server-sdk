'use strict';

const express = require('express');
const router = express.Router();

router.get('/', require('./welcome'));
router.post('/auth', require('./auth'));
router.post('/tunnel/get/wsurl', require('./tunnel-get-wsurl'));
router.post('/tunnel/ws/push', require('./tunnel-ws-push'));

module.exports = router;