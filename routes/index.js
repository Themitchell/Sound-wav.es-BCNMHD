
/*
 * GET home page.
 */

exports.index = function(req, res, client){
    client.hgetall('sequencer', function (err, replies) {
        var response = (replies == null || undefined) ? {} : replies;
        res.render('index', { sequencer: response });
    });
};
