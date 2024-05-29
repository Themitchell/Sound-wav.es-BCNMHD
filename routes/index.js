export const index = (req, res, redis_client) => {
    redis_client.hGetAll('sequencer')
        .then(replies => {
            var response = (replies == null || undefined) ? {} : replies;
            res.render('index', { sequencer: response });
        });
};

export default {
    index: index
}
