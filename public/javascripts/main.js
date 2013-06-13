var App = (function () {

    var $sequencerEl = $('table');
    var $sequencerRows = $sequencerEl.find('tr');

    var samples = [null, null, null, null, null, null, null, null];

    // Thanks to cwilso on github for his code which helped to inspire this apps accurate timing
    // https://github.com/cwilso/metronome/

    var audioContext    = new webkitAudioContext(),
    metronomeState      = 0,

    isScheduling        = false,
    timerID             = 0,

    // SETTINGS:
    // Tempo (duh!)
    tempo               = 180.0,
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
        debugger;
        $.each($sequencerRows, function (i, row) {
            debugger;
            beatElements.push($(row).find('td')[beatNumber]);
        });
        // if ($(step).hasClass('active')) samples[i].start(time);
    },

    schedule = function () {
        while (nextNoteTime < audioContext.currentTime + scheduleAheadTime ) {
            notesInQueue.push( { note: current16thNote, time: nextNoteTime } );
            // scheduleClick( current16thNote, nextNoteTime );
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

    createSoundSource = function (buffer) {
        var source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        return source;
    },

    initialize = function () {
        var kick;
        var request = new XMLHttpRequest();
        request.open('GET', 'kick.mp3', true);
        request.responseType = 'arraybuffer';

        // Decode asynchronously
        request.onload = function() {
            audioContext.decodeAudioData(request.response, function (buffer) {
                kick = buffer;
                // TODO: make this NOT be all the kicks
                for (var i = 0; i < samples.length; i++) {
                    samples[i] = createSoundSource(kick);
                }
            }, onError);
        }

        request.send();

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

    $('#tempo').val(tempo);
    $('#tempo').on('change', function () {
        tempo = $('#tempo').val();
    });

    return {
        init: initialize
    };

})();

function onError () {
    alert('shiiiiiiiiiiit!');
}


app = App.init()
