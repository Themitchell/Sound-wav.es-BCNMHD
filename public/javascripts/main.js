var App = (function () {

    var client_id = '6f712c5ac1236d7729360ee6afc65292';
    var socket = io.connect('http://localhost');

    var $sequencerEl = $('table');
    var $sequencerRows = $sequencerEl.find('tr');

    var samples = [null, null, null, null];

    // Thanks to cwilso on github for his code which helped to inspire this apps accurate timing
    // https://github.com/cwilso/metronome/

    var audioContext    = new webkitAudioContext(),
    metronomeState      = 0,

    isScheduling        = false,
    timerID             = 0,

    // SETTINGS:
    // Tempo (duh!)
    tempo               = $('#tempo').val(),
    // Time to lookahead for scheduling notes within (Buffer size)
    lookahead           = 25.0,
    // Time ahead of playhead to schedule notes (When to buffer)
    scheduleAheadTime   = 0.1,
    // Length of a note in seconds
    clickLength         = 0.05,
    //
    sequenceLengthIn    = 16,

    noteResolutionIndex = ['16th', '8th', 'quarter', 'half', 'whole'],
    noteResolution      = 2,


    // STATUSES:
    // Current 16th note placement (where the playhead is!)
    current16thNote,
    // Note Queue for notes ready to be played (The sample queue)
    notesInQueue = [],

    nextNote = function () {
        // Advance current note and time by a 16th note...
        var secondsPerBeat = 60.0 / tempo;  // Notice this picks up the CURRENT
                                            // tempo value to calculate beat length.
        nextNoteTime += 0.25 * secondsPerBeat;  // Add beat length to last beat time

        current16thNote++;  // Advance the beat number, wrap to zero
        if (current16thNote == 16) {
            current16thNote = 0;
        }
    },

    scheduleClick = function ( beatNumber, time ) {
        if (metronomeState == 0) return;
        if (beatNumber%4) return;

        var osc = audioContext.createOscillator();
        osc.connect( audioContext.destination );
        osc.frequency.value = 440.0;

        osc.noteOn( time );
        osc.noteOff( time + clickLength );
    },

    scheduleNotes = function ( beatNumber, time ) {
        var beatElements = [];
        for (var i=0; i < $sequencerRows.length; i++) {
            var step = $($sequencerRows[i]).find('td')[beatNumber];
            if ($(step).hasClass('active') && (samples[i] != null || undefined)) {
                createSoundSource(samples[i]).start(time);
            }
        }
    },

    schedule = function () {
        while (nextNoteTime < audioContext.currentTime + scheduleAheadTime ) {
            notesInQueue.push( { note: current16thNote, time: nextNoteTime } );
            scheduleClick( current16thNote, nextNoteTime );
            scheduleNotes( current16thNote, nextNoteTime );
            nextNote();
        }
        timerID = window.setTimeout( schedule, lookahead );
    },

    start = function () {
        debugger;
        isScheduling = true;
        current16thNote = 0;
        nextNoteTime = audioContext.currentTime;
        schedule();
    },

    stop = function () {
        isScheduling = false;
        window.clearTimeout( timerID );
    },

    getSample = function (path, sequenceRow) {
        var sample;
        var request = new XMLHttpRequest();
        request.open('GET', path + '?client_id=' + client_id, true);
        request.responseType = 'arraybuffer';
        request.onload = function() {
            audioContext.decodeAudioData(request.response, function (buffer) {
                samples[sequenceRow] = buffer;
            }, onError);
        }

        request.send();
    },

    createSoundSource = function (buffer) {
        var source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        return source;
    },

    scsearch = function (term) {
        SC.get('/tracks', { limit: 5 }, function (tracks) {
            for (var i=0; i < tracks.length; i++) {
                var track = tracks[i];
                console.log(track.stream_url);
                var $resultEl = $('<li>' + track.title + '</li>');
                // $('#search-results').append($resultEl);
            }
        });
    },

    initialize = function () {
        SC.initialize({
            client_id: '6f712c5ac1236d7729360ee6afc65292'
        });

        return {
            start:  start,
            stop:   stop,
            samples: function () {
                return samples;
            }
        };
    };

    $('#metronome-toggle').on('click', function () {
        if (metronomeState == 0) {
            metronomeState = 1;
        } else {
            metronomeState = 0
        }
    });

    $('#play').on('click', function () {
        if (!isScheduling) {
            start();
        }
    });

    $('#stop').on('click', function () {
        if (isScheduling) {
            stop();
        }
    });

    $('#tempo').on('change', function (e) {
        socket.emit('setTempo', { tempo: $('#tempo').val() });
    });

    socket.on('updateTempo', function (data) {
        tempo = data.tempo;
        $('#tempo').val(data.tempo);
    });

    $('td').on('click', function () {
        socket.emit('setState', { id: $(this).attr('id'), state: (($(this).hasClass('active')) ? 0 : 1) });
    });


    socket.on('updateState', function (data) {
        var $element = $('td#' + data.id);
        if (data.state == 0) {
            $element.removeClass('active');
        } else if (data.state == 1) {
            $element.addClass('active');
        }
    });

    $('#search').keyup(function () {
        scsearch($(this).val());
    });

    $("#search").select2({
        placeholder: "Search for a sample",
        minimumInputLength: 3,
        ajax: {
            url: "http://api.soundcloud.com/tracks.json",
            dataType: 'jsonp',
            quietMillis: 100,
            data: function (term) {
                return {
                    q: term,
                    limit: 10,
                    duration: {
                        to: 5000
                    },
                    client_id: client_id
                };
            },
            results: function (data, page) {
                return { results: data }
            }
        },
        formatResult: formatResult, // omitted for brevity, see the source of this page
        formatSelection: formatSelection, // omitted for brevity, see the source of this page
        dropdownCssClass: "bigdrop", // apply css that makes the dropdown taller
        escapeMarkup: function (m) { return m; } // we do not want to escape markup since we are displaying html in results
    });

    $("#selected-track").select2();

    $('#add-to-track').on('click', function () {
        $selectedSoundEl = $('#s2id_search .search-result');
        $selectedTrackEl = $('#selected-track');
        getSample(JSON.parse($selectedSoundEl.attr('data-object')).stream_url, $selectedTrackEl.val());
    });

    return {
        init: initialize
    };

})();

function onError () {
    alert('Shiiiiiiiiiiit! Its borked!');
}

function formatResult(sound) {
    var json = JSON.stringify(sound);
    var markup =    $(['<span class="search-result">',
                    sound.title,
                    '</span>'].join(''));
    markup.attr('data-object', json);
    return markup[0];
}

function formatSelection(sound) {
    return formatResult(sound);
}

app = App.init()

