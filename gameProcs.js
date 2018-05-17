class GameProcs {

    static randomRowColor() {
        let row_colors = CONSTANTS.GameBrick.ROW_COLORS;
        let rand_num = GameProcs.getRandomInt(row_colors.length);
        let color_tuple = row_colors[rand_num];
        let [red, green, blue] = color_tuple;
        let rgb_color = 'rgb(' + red + ',' + green + ',' + blue + ')';
        return rgb_color;
    }

    static figureBrickWidth(screen_width, start_width) {
        const smallest_brick = Math.floor(CONSTANTS.GameBrick.WIDTH / 2);
        for (let brick_width = start_width; brick_width >= smallest_brick; brick_width--) {
            if (screen_width % brick_width == 0) {
                return [brick_width, 0];
            }
        }
        const margin_size = screen_width % start_width;
        const l_r_margins = Math.floor(margin_size / 2);
        return [start_width, l_r_margins];
    }

    static figureHeights(screen_height, percents_array) {
        let [upper_perc, brick_perc, middle_perc] = percents_array;
        let upper_px = Math.floor(screen_height * upper_perc / 100);
        let brick_px = Math.floor(screen_height * brick_perc / 100);
        let middle_px = Math.floor(screen_height * middle_perc / 100);
        let win_lose_px = upper_px + brick_px + (middle_px / 2);
        return [brick_px, middle_px, win_lose_px];
    }

    static startMobileTouch() {
        document.addEventListener("touchstart", GameProcs.touch2Mouse, true);
        document.addEventListener("touchmove", GameProcs.touch2Mouse, true);
        document.addEventListener("touchend", GameProcs.touch2Mouse, true);
    }

    // from https://www.codicode.com/art/easy_way_to_add_touch_support_to_your_website.aspx
    static touch2Mouse(e) {
        let theTouch = e.changedTouches[0];
        let mouseEv;
        switch (e.type) {
            case "touchstart":
                mouseEv = "mousedown";
                break;
            case "touchend":
                mouseEv = "mouseup";
                break;
            case "touchmove":
                mouseEv = "mousemove";
                break;
            default:
                return;
        }
        let mouseEvent = document.createEvent("MouseEvent");
        mouseEvent.initMouseEvent(mouseEv, true, true, window, 1, theTouch.screenX, theTouch.screenY, theTouch.clientX, theTouch.clientY, false, false, false, false, 0, null);
        theTouch.target.dispatchEvent(mouseEvent);
    }

    static viewportSize() {
        let e = window,
            a = 'inner';
        if (!('innerWidth' in window)) {
            a = 'client';
            e = document.documentElement || document.body;
        }
        return {
            screen_width: e[a + 'Width'],
            screen_height: e[a + 'Height']
        };
    }

    static hiddenBallPool(init_balls, game_container, width_of_bricks, bricks_bottom, y_diff_bricks_ball_start, is_desktop) {
        let ball_list = Immutable.List([]);
        for (let i = 0; i < init_balls; i++) {
            let new_ball = GameBall.ballFactory(game_container, width_of_bricks, bricks_bottom, y_diff_bricks_ball_start, is_desktop);
            new_ball.setUnused();
            ball_list = ball_list.push(new_ball);
        }
        return ball_list;
    }

    static findUsableBall(ball_list, game_container, width_of_bricks, bricks_bottom, y_diff_bricks_ball_start, is_desktop) {
        let found_unused = false;
        ball_list.valueSeq().forEach(function (game_ball) {
            if (game_ball.unusedBall()) {
                game_ball.resetToStart();
                found_unused = true;
                return false;
            }
        });
        if (!found_unused) {
            let new_ball = GameBall.ballFactory(game_container, width_of_bricks, bricks_bottom, y_diff_bricks_ball_start, is_desktop);
            ball_list = ball_list.push(new_ball);
        }
        return ball_list;
    }

    static makeAudio(start_button) {
        let audio_context;
        if (window.AudioContext) {
            audio_context = new window.AudioContext();
        } else {
            audio_context = new window.webkitAudioContext();
        }
        start_button.addEventListener('click', function () {
            audio_context.resume();
        });
        const brick_sound_fn = GameProcs.bounceSound(audio_context, 'square');
        const paddle_sound_fn = GameProcs.bounceSound(audio_context, 'sawtooth');
        return {
            brick_sound_fn,
            paddle_sound_fn
        };
    }

    static moveStartButton(move_paddle, button_on_paddle) {
        let {
            paddle_x_center,
            paddle_y
        } = move_paddle.centerX();
        let client_rect = button_on_paddle.getBoundingClientRect();
        let button_width = client_rect.width;
        let start_button_left = paddle_x_center - button_width / 2;
        button_on_paddle.style.left = start_button_left;
        button_on_paddle.style.top = paddle_y - (CONSTANTS.GamePaddle.HEIGHT * 2);
    }

    static mutateBalls(ball_list, width_of_bricks, bottom_paddleX, move_paddle) {
        ball_list.valueSeq().forEach(function (game_ball) {
            if (!game_ball.unusedBall()) {
                game_ball.moveXy(width_of_bricks);
            }
        });
        ball_list.valueSeq().forEach(function (game_ball) {
            if (!game_ball.unusedBall()) {
                let ball_hit_paddle = game_ball.hitPaddle(move_paddle);
                if (ball_hit_paddle) {
                    move_paddle.showImage();
                }
            }
        });
        ball_list.valueSeq().forEach(function (game_ball) {
            if (!game_ball.unusedBall()) {
                game_ball.hideOffScreenBall(bottom_paddleX);
            }
        });
        return ball_list;
    }

    static getRandomInt(max) {
        return Math.floor(Math.random() * Math.floor(max));
    }

    static getRandomArbitrary(min, max) {
        return Math.random() * (max - min) + min;
    }

    static toHex(dec_number) {
        return ("0" + (Number(dec_number).toString(16))).slice(-2).toUpperCase();
    }

    static bounceSound(audio_context, wave_type) {
        return function () {
            let oscillator = audio_context.createOscillator();
            oscillator.connect(audio_context.destination);
            oscillator.type = wave_type;
            oscillator.start();
            oscillator.stop(audio_context.currentTime + 0.05);
        };
    }

    static winOrLose(winner_winner, hor_center, win_lose_px) {
        let you_win_lose;
        if (winner_winner) {
            you_win_lose = document.getElementById('you-win');
        } else {
            you_win_lose = document.getElementById('you-lose');
        }
        you_win_lose.style.display = 'block';
        you_win_lose.style.top = win_lose_px;
        you_win_lose.style.left = hor_center;
    }

    static isDesktop() {
        if ('ontouchstart' in document.documentElement) {
            return false;
        } else {
            return true;
        }
    }


}
