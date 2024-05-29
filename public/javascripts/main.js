    var mappings = {
        'a0': 0,
        'a1': 1,
        'a2': 2,
        'a3': 3,
        'a4': 4,
        'a5': 5,
        'a6': 6,
        'a7': 7,
        'a8': 16,
        'a9': 17,
        'a10': 18,
        'a11': 19,
        'a12': 20,
        'a13': 21,
        'a14': 22,
        'a15': 23,
        'b0': 32,
        'b1': 33,
        'b2': 34,
        'b3': 35,
        'b4': 36,
        'b5': 37,
        'b6': 38,
        'b7': 39,
        'b8': 48,
        'b9': 49,
        'b10': 50,
        'b11': 51,
        'b12': 52,
        'b13': 53,
        'b14': 54,
        'b15': 55,
        'c0': 64,
        'c1': 65,
        'c2': 66,
        'c3': 67,
        'c4': 68,
        'c5': 69,
        'c6': 70,
        'c7': 71,
        'c8': 80,
        'c9': 81,
        'c10': 82,
        'c11': 83,
        'c12': 84,
        'c13': 85,
        'c14': 86,
        'c15': 87,
        'd0': 96,
        'd1': 97,
        'd2': 98,
        'd3': 99,
        'd4': 100,
        'd5': 101,
        'd6': 102,
        'd7': 103,
        'd8': 112,
        'd9': 113,
        'd10': 114,
        'd11': 115,
        'd12': 116,
        'd13': 117,
        'd14': 118,
        'd15': 119
    };

var invert = function (obj) {

  var new_obj = {};

  for (var prop in obj) {
    if(obj.hasOwnProperty(prop)) {
      new_obj[obj[prop]] = prop;
    }
  }

  return new_obj;
};

var App = (function () {
    var soundcloud_client_id = '6f712c5ac1236d7729360ee6afc65292';
    var socket = io.connect(window.location.origin);
    var Jazz = document.getElementById("Jazz1");
    if(!Jazz || !Jazz.isJazz) Jazz = document.getElementById("Jazz2");

    var jazzEnabled = Jazz.isJazz

    var $sequencerEl = $('table');
    var $sequencerRows = $sequencerEl.find('tr');

    var samples = [null, null, null, null];

    // Thanks to cwilso on github for his code which helped to inspire this apps accurate timing
    // https://github.com/cwilso/metronome/

    var audioContext    = new AudioContext(),
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
        request.open('GET', path + '?client_id=' + soundcloud_client_id, true);
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

    parseMidi = function (t,a,b,c){
        console.log(t, a, b, c);

        var el_id = invert(mappings)[b];
        var element = $('#' + el_id);
        if (c == 127) {
            socket.emit('setState', { id: element.attr('id'), state: ((element.hasClass('active')) ? 0 : 1) });
        }
        // var note = ['a', 'b', 'c', 'd'];
        // if ((b >= 0) || (b <= 15)) {
        //     var element = $('#a'+b);
        //     if (c == 127) {
        //         socket.emit('setState', { id: element.attr('id'), state: ((element.hasClass('active')) ? 0 : 1) });
        //     }
        // }
    },

    initialize = function () {
        SC.initialize({
            client_id: soundcloud_client_id
        });

        if (jazzEnabled) {
            Jazz.MidiInOpen('Launchpad S', parseMidi);
            Jazz.MidiOutOpen('Launchpad S');
        }

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
        if (jazzEnabled) {
            Jazz.MidiOut(0x90, mappings[data.id], ((data.state == 0) ? 0 : 127)  );
        }
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

