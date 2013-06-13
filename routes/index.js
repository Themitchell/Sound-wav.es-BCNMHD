
/*
 * GET home page.
 */

exports.index = function(req, res, client){
    client.hgetall('sequencer', function (err, replies) {
        res.render('index', { sequencer: replies });
    });
};
