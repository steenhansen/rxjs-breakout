let {
    screen_width,
    screen_height
} = GameProcs.viewportSize();


let [brick_width, l_r_margins] = GameProcs.figureBrickWidth(screen_width, CONSTANTS.GameBrick.WIDTH);
let brick_height = Math.floor(brick_width / 2);
document.getElementsByTagName("body")[0].style.margin = l_r_margins;
let bricks_wide = Math.floor(screen_width / brick_width);

let [brick_px, middle_px, win_lose_px] = GameProcs.figureHeights(screen_height, CONSTANTS.SCREEN_PERCENTS);

let bricks_tall = Math.floor(brick_px / brick_height);
//bricks_wide =11
//bricks_tall =1


const start_button = document.querySelector('button');

let {
    brick_sound_fn,
    paddle_sound_fn
} = GameProcs.makeAudio(start_button);

let game_container = document.getElementById('game-board');

let brick_list = GameBrick.brickWallFactory(game_container, bricks_tall, bricks_wide, brick_sound_fn);
let bricks_bottom = GameBrick.class_var.bottom_most_edge;
let width_of_bricks = GameBrick.class_var.right_most_edge;


let bricks_to_paddle = middle_px;
let move_paddle = GamePaddle.paddleFactory(game_container, paddle_sound_fn, width_of_bricks, bricks_to_paddle, bricks_bottom);

GameProcs.moveStartButton(move_paddle, start_button);

let bottom_paddleX = move_paddle.bottomPaddle();
let pre_made_balls = CONSTANTS.GameBall.PRE_MADE_BALLS;
let y_diff_bricks_ball_start = 20;
const is_desktop = GameProcs.isDesktop();
let ball_list = GameProcs.hiddenBallPool(pre_made_balls, game_container, width_of_bricks, bricks_bottom,
    y_diff_bricks_ball_start, is_desktop);
ball_list = GameProcs.findUsableBall(ball_list, game_container, width_of_bricks, bricks_bottom,
    y_diff_bricks_ball_start, is_desktop);


let number_balls$ = Rx.Observable.interval(1000);
let game_ticks$ = Rx.Observable.interval(CONSTANTS.GamePaddle.SIXTY_FPS, Rx.Scheduler.requestAnimationFrame);

let number_balls = 0;
const init_game_state = {
    brick_list,
    ball_list,
    move_paddle,
    number_balls
};

let still_alive = true;
let winner_winner = false;

GameProcs.startMobileTouch();

const mouse_x$ = Rx.Observable.fromEvent(document, "mousemove")
    .map(event => {
        return event.clientX;
    });

let game_data$ = game_ticks$
    .withLatestFrom(number_balls$, mouse_x$,
        (game_tick, number_balls, mouse_x) => {
            const current_events = {
                game_tick,
                number_balls,
                mouse_x
            };
            return current_events;
        })
    .scan(
        (current_game_state, current_events) => {
            let {
                brick_list,
                ball_list,
                move_paddle
            } = current_game_state;
            move_paddle.hideImage();
            move_paddle.scrollSideways(current_events.mouse_x);
            ball_list = GameProcs.mutateBalls(ball_list, width_of_bricks, bottom_paddleX, move_paddle);
            brick_list = GameBall.hitBricks(ball_list, brick_list, bricks_bottom);
            if (brick_list.size == 0) {
                still_alive = false;
                winner_winner = true;
            }
            if (current_events.number_balls !== current_game_state.number_balls) {
                ball_list = GameProcs.findUsableBall(ball_list, game_container, width_of_bricks, bricks_bottom, is_desktop);
                current_game_state.number_balls = current_events.number_balls;
                still_alive = move_paddle.shrinkPaddle(CONSTANTS.GamePaddle.PIX_SHRINK_PER_SEC);
            }
            let number_balls = current_events.number_balls;
            const new_game_state = {
                brick_list,
                ball_list,
                move_paddle,
                number_balls,
                still_alive
            };
            // throw "after start";
            return new_game_state;
        }, init_game_state
    )
    .takeWhile(new_game_state => new_game_state.still_alive);

Rx.Observable.fromEvent(start_button, 'click').subscribe(() => {
    start_button.style.display = 'none';
    game_data$.subscribe({
        next: () => {},
        complete: () => GameProcs.winOrLose(winner_winner, screen_width / 2, win_lose_px)
    });
});
