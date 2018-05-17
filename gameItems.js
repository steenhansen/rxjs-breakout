const CONSTANTS = {
    SCREEN_PERCENTS: [10, 40, 40, 10], // [upper_perc, brick_perc, middle_perc, bottom_perc]
    GameItem: {
        HIDE_OFFSCREEN: -1234,
        SIXTY_FPS: 17
    },
    GameBrick: {
        ROWS: 3,
        COLUMNS: 6,
        PREFIX: "brick_canvas_",
        WIDTH: 40,
        HEIGHT: 20,
        TOP_SPACE: 10,
        ROW_COLORS: [
            [0, 163, 199], // light blue
            [240, 102, 0], // dark orange
            [140, 199, 0], // light green
            [240, 0, 0], // red
            [0, 100, 181], // medium blue
            [240, 148, 0], // medium orange
            [240, 240, 0], // yellow
            [99, 0, 165], // blue purple
            [197, 0, 124], // purple
            [15, 173, 0], // dark green
            [240, 197, 0], // light orange
            [0, 16, 165] // dark blue
        ]
    },
    GamePaddle: {
        MOST_HORIZONTAL_STEPS: 1.75,
        PREFIX: "paddle_canvas_",
        WIDTH: 101,
        HEIGHT: 20,
        MOVE_COLOR: 'gray',
        HIT_COLOR: 'red',
        PIX_SHRINK_PER_SEC: 1

    },
    GameBall: {
        PREFIX: "ball_canvas_",
        MAX_SPEED: 2,
        MIN_SPEED: 0.75,
        ARC_OF_CIRCLE: Math.PI * 2,
        CROSS_WIDTH: 2,
        MAX_BALL_STEP: 2,
        MIN_BALL_STEP: 0,
        RANDOM_MIN: 0.1,
        RANDOM_MAX: 1.9,
        PRE_MADE_BALLS: 99,
        HIDE_LEFT_BALL: -1000,
        IGNORE_WIDTH: 5678,
        DIAMETER: 17,
        COLOR: 'black',
        HIT_COLOR: 'red'
    }

};
CONSTANTS.GameBall.RADIUS = Math.floor(CONSTANTS.GameBall.DIAMETER / 2);
CONSTANTS.GameBall.RADIUS_INT = Math.floor((CONSTANTS.GameBall.DIAMETER - 1) / 2);


class GameItem {
    constructor(game_item) {
        let {
            game_container,
            item_id,
            item_width,
            item_height
        } = game_item;
        this.item_width = item_width;
        this.item_height = item_height;
        let [item_fragment, a_canvas, canvas_context] = this.makeContext(item_id, item_width, item_height);
        this.item_canvas = a_canvas;
        this.canvas_context = canvas_context;
        game_container.appendChild(item_fragment);
    }

    makeContext(item_id, item_width, item_height) {
        let item_fragment = document.createDocumentFragment();
        let a_canvas = document.createElement('canvas');
        a_canvas.id = item_id;
        a_canvas.width = item_width;
        a_canvas.height = item_height;
        let canvas_context = a_canvas.getContext('2d');
        item_fragment.appendChild(a_canvas);
        a_canvas.style.left = CONSTANTS.GameItem.HIDE_OFFSCREEN;
        a_canvas.style.position = "absolute";
        return [item_fragment, a_canvas, canvas_context];
    }

}


class GameImage extends GameItem {
    constructor(game_image) {
        let {
            game_container,
            item_id,
            temp_image_color,
            item_width,
            item_height
        } = game_image;
        super(game_image);
        let temp_image_id = item_id + '_temp_image';
        let [item_fragment, a_canvas, canvas_context] = this.makeContext(temp_image_id, item_width, item_height);
        this.temp_image = a_canvas;
        this.drawImage(canvas_context, temp_image_color);
        game_container.appendChild(item_fragment);
    }

    showImage() {
        this.temp_image.style.zIndex = 1;
        this.temp_image.style.display = 'block';
    }

    hideImage() {
        this.temp_image.style.zIndex = -1;
        this.temp_image.style.display = 'none';
    }

}

class GamePaddle extends GameImage {

    static paddleFactory(game_container, paddle_sound_fn, width_of_bricks, bricks_to_paddle, bricks_bottom) {
        let paddle_y = bricks_bottom + bricks_to_paddle;
        let paddle_x_center = Math.floor(width_of_bricks / 2);
        let item_width = CONSTANTS.GamePaddle.WIDTH;
        let item_height = CONSTANTS.GamePaddle.HEIGHT;
        let temp_image_color = CONSTANTS.GamePaddle.HIT_COLOR;
        let game_paddle = {
            game_container,
            temp_image_color,
            item_width,
            item_height,
            paddle_y,
            paddle_x_center,
            width_of_bricks
        };
        let move_paddle = new GamePaddle(game_paddle, paddle_sound_fn);
        return move_paddle;
    }

    shrinkPaddle(shrink_pixels) {
        this.item_width = this.item_width - shrink_pixels;
        this.item_canvas.style.width = this.item_width;
        this.item_canvas.style.height = this.item_height;

        this.temp_image.style.width = this.item_width;
        this.temp_image.style.height = this.item_height;

        if (this.item_width > 0) {
            return true;
        } else {
            return false;
        }
    }

    stepSizes(ball_h_center) {
        let to_center = Math.floor(this.item_width / 2) + 1;
        let paddle_h_center = this.left + to_center;
        let paddle_offset = to_center + CONSTANTS.GameBall.RADIUS;
        let hor_offset, ver_offset;
        if (ball_h_center === paddle_h_center) {
            hor_offset = CONSTANTS.GameBall.MIN_BALL_STEP;
            ver_offset = -CONSTANTS.GameBall.MAX_BALL_STEP;
        } else if (ball_h_center < paddle_h_center) {
            let left_of_paddle_center = paddle_offset - (paddle_h_center - ball_h_center);
            [hor_offset, ver_offset] = this.angleSteps(left_of_paddle_center);
            hor_offset = -hor_offset;
        } else {
            let right_of_paddle_center = paddle_offset - (ball_h_center - paddle_h_center);
            [hor_offset, ver_offset] = this.angleSteps(right_of_paddle_center);
        }
        return [hor_offset, ver_offset];
    }

    constructor(game_paddle, paddle_sound_fn) {
        let {
            game_container,
            temp_image_color,
            item_width,
            item_height,
            paddle_y,
            paddle_x_center,
            width_of_bricks,
            paddle_color
        } = game_paddle;
        if (typeof GamePaddle.class_var === 'undefined') {
            GamePaddle.initClassVars();
        }
        GamePaddle.class_var.paddle_count++;
        let item_id = CONSTANTS.GamePaddle.PREFIX + GamePaddle.class_var.paddle_count;
        let game_item = {
            game_container,
            item_id,
            temp_image_color,
            item_width,
            item_height
        };
        super(game_item);
        this.paddle_y = paddle_y;
        this.paddle_sound_fn = paddle_sound_fn;
        this.item_width = item_width;
        this.item_height = item_height;
        this.width_of_board = width_of_bricks;
        this.theXySteps = this.xySteps();
        this.drawImage(this.canvas_context, paddle_color);
        this.startPosition(item_height, paddle_y, paddle_x_center);
    }

    static initClassVars() {
        GamePaddle.class_var = {
            paddle_count: 0
        };
    }

    bottomPaddle() {
        return this.top + this.item_height;
    }

    xySteps() {
        let ball_points = CONSTANTS.GameBall.RADIUS;
        let paddle_side_points = Math.floor(this.item_width / 2);
        let possible_points = ball_points + paddle_side_points + 1;
        this.x_steps = new Array(possible_points); //  1.75,0.25 ..... 1,1 ........ 0.25,1.75
        this.y_steps = new Array(possible_points);
        let start_x_steps = CONSTANTS.GamePaddle.MOST_HORIZONTAL_STEPS;
        let x_change = start_x_steps / possible_points;
        for (let i = 0; i < possible_points; i++) {
            this.x_steps[i] = start_x_steps;
            this.y_steps[i] = 0 - (CONSTANTS.GameBall.MAX_BALL_STEP - start_x_steps);
            start_x_steps = start_x_steps - x_change;
        }
    }

    drawImage(canvas_context, paddle_color) {
        canvas_context.fillStyle = CONSTANTS.GamePaddle.MOVE_COLOR;
        canvas_context.fillRect(0, 0, this.item_canvas.width, this.item_canvas.height);
        canvas_context.fillStyle = paddle_color;
        canvas_context.fillRect(0, 0, this.item_canvas.width, 8);
    }

    startPosition(item_height, paddle_y, paddle_x_center) {
        this.top = paddle_y;
        this.left = Math.floor(paddle_x_center - (this.item_width / 2));
        this.bottom = paddle_y + item_height - 1;
        this.right = this.left + this.item_width - 1;
        this.item_canvas.style.top = this.top;
        this.item_canvas.style.left = 0;
        this.item_canvas.style.transform = "translate(" + this.left + "px)";
    }

    centerX() {
        let paddle_x_center = Math.floor(this.left + (this.item_width / 2));
        let paddle_y = this.paddle_y;
        return {
            paddle_x_center,
            paddle_y
        };
    }

    scrollSideways(mouse_x) {
        let new_left_pos = mouse_x;
        let new_right_pos = new_left_pos + this.item_width - 1;
        if ((new_left_pos > 0) && (new_right_pos < this.width_of_board)) {
            this.left = mouse_x;
            this.right = this.left + this.item_width - 1;
            this.item_canvas.style.transform = "translate(" + this.left + "px)";
        }
    }

    angleSteps(hor_offset) {
        if (hor_offset < 0) {
            hor_offset = 0;
        } else if (hor_offset >= this.x_steps.length) {
            hor_offset = this.x_steps.length - 1;
        }
        let hor_steps = this.x_steps[hor_offset];
        let ver_steps = this.y_steps[hor_offset];
        return [hor_steps, ver_steps];
    }
}

class GameBrick extends GameItem {

    static brickWallFactory(game_container, number_rows, number_columns, brick_sound_fn) {
        let item_width = CONSTANTS.GameBrick.WIDTH;
        let item_height = CONSTANTS.GameBrick.HEIGHT;
        let brick_list = Immutable.List([]);
        let vertical_offset = CONSTANTS.GameBrick.TOP_SPACE;
        game_container.style.top = vertical_offset;
        for (let row = 0; row < number_rows; row++) {
            for (let column = 0; column < number_columns; column++) {
                let new_game_brick = {
                    game_container,
                    item_width,
                    item_height,
                    vertical_offset,
                    column,
                    row
                };
                let game_brick = new GameBrick(new_game_brick, brick_sound_fn);
                brick_list = brick_list.push(game_brick);
            }
        }
        return brick_list;
    }

    constructor(new_game_brick, brick_sound_fn) {
        let {
            game_container,
            item_width,
            item_height,
            vertical_offset,
            column,
            row
        } = new_game_brick;

        if (typeof GameBrick.class_var === 'undefined') {
            GameBrick.initClassVars();
        }
        let item_id = CONSTANTS.GameBrick.PREFIX + column + '_' + row;
        let game_item = {
            game_container,
            item_id,
            item_width,
            item_height
        };
        super(game_item);
        this.brick_sound_fn = brick_sound_fn;
        this.drawBrick(item_width, item_height, column, row);
        this.startPosition(item_width, item_height, vertical_offset, column, row);
        this.adjustRightBottomEdges();
    }

    static initClassVars() {
        GameBrick.class_var = {
            right_most_edge: 0,
            bottom_most_edge: 0
        };
    }

    radomColor(brick_row) {
        if (brick_row >= CONSTANTS.GameBrick.ROW_COLORS.length) {
            brick_row = brick_row - CONSTANTS.GameBrick.ROW_COLORS.length;
        }
        let rgb_start = CONSTANTS.GameBrick.ROW_COLORS[brick_row];
        let rgb_str = "#" + GameProcs.toHex(rgb_start[0]) + GameProcs.toHex(rgb_start[1]) + GameProcs.toHex(
            rgb_start[2]);
        return rgb_str;
    }

    startPosition(item_width, item_height, vertical_offset, brick_column, brick_row) {
        this.top = brick_row * item_height + vertical_offset;
        this.left = brick_column * item_width;
        this.bottom = this.top + item_height - 1;
        this.right = this.left + item_width - 1;
        this.item_canvas.style.top = this.top;
        this.item_canvas.style.left = this.left;
    }

    adjustRightBottomEdges() {
        if (this.bottom > GameBrick.class_var.bottom_most_edge) {
            GameBrick.class_var.bottom_most_edge = this.bottom;
        }
        if (this.right > GameBrick.class_var.right_most_edge) {
            GameBrick.class_var.right_most_edge = this.right;
        }
    }

    drawBrick(item_width, item_height, brick_column, brick_row) {
        let row_rand = Math.floor(GameProcs.getRandomArbitrary(0, CONSTANTS.GameBrick.ROW_COLORS.length));
        let rgb_start = this.radomColor(brick_row);
        let rgb_end = this.radomColor(row_rand);
        let gradient = this.canvas_context.createLinearGradient(0, 0, item_width, item_height);
        gradient.addColorStop(0, rgb_start);
        gradient.addColorStop(1, rgb_end);
        this.canvas_context.fillStyle = gradient;
        this.canvas_context.fillRect(1, 1, item_width - 2, item_height - 2);
    }

    hideBlock() {
        let block_elem = document.getElementById(this.item_canvas.id);
        block_elem.style.display = 'none';
    }

}

class GameBall extends GameImage {

    static initClassVars() {
        GameBall.class_var = {
            ball_number: 0
        };
    }

    static randomSteps() {
        let start_top_step = GameProcs.getRandomArbitrary(CONSTANTS.GameBall.RANDOM_MIN, CONSTANTS.GameBall.RANDOM_MAX);
        let start_left_step;
        if (GameProcs.getRandomInt(2) == 1) {
            start_left_step = CONSTANTS.GameBall.MAX_BALL_STEP - start_top_step;
        } else {
            start_left_step = -(CONSTANTS.GameBall.MAX_BALL_STEP - start_top_step);
        }
        return [start_top_step, start_left_step];
    }

    static startValues(width_of_bricks, bricks_bottom, y_diff_bricks_ball_start) {
        let start_x_ball = width_of_bricks / 2;
        let start_y_ball = bricks_bottom + y_diff_bricks_ball_start;
        let [start_top_step, start_left_step] = GameBall.randomSteps();
        let speed_multiplier = GameProcs.getRandomInt(CONSTANTS.GameBall.MAX_SPEED) + CONSTANTS.GameBall.MIN_SPEED;
        return {
            start_x_ball,
            start_y_ball,
            start_top_step,
            start_left_step,
            speed_multiplier
        };
    }

    static ballFactory(game_container, width_of_bricks, bricks_bottom, y_diff_bricks_ball_start, is_desktop) {
        let temp_image_color = CONSTANTS.GameBall.HIT_COLOR;
        let {
            start_x_ball,
            start_y_ball,
            start_top_step,
            start_left_step,
            speed_multiplier
        } = GameBall.startValues(width_of_bricks, bricks_bottom, y_diff_bricks_ball_start);

        let new_ball = {
            game_container,
            temp_image_color,
            start_x_ball,
            start_y_ball,
            speed_multiplier,
            start_top_step,
            start_left_step,
            width_of_bricks,
            bricks_bottom,
            y_diff_bricks_ball_start,
            is_desktop
        };
        var game_ball = new GameBall(new_ball);
        return game_ball;
    }

    constructor(new_ball) {
        let {
            game_container,
            temp_image_color,
            start_x_ball,
            start_y_ball,
            speed_multiplier,
            start_top_step,
            start_left_step,
            width_of_bricks,
            bricks_bottom,
            y_diff_bricks_ball_start,
            is_desktop
        } = new_ball;

        if (typeof GameBall.class_var === 'undefined') {
            GameBall.initClassVars();
        }
        GameBall.class_var.ball_number++;
        let item_id = CONSTANTS.GameBall.PREFIX + GameBall.class_var.ball_number;
        let item_width = CONSTANTS.GameBall.DIAMETER;
        let item_height = CONSTANTS.GameBall.DIAMETER;
        let game_item = {
            game_container,
            temp_image_color,
            item_id,
            item_width,
            item_height
        };
        super(game_item);
        this.is_desktop = is_desktop;
        this.spin_count = GameProcs.getRandomInt(123);
        if (GameProcs.getRandomInt(2) == 1) {
            this.spin_direction = 1;
        } else {
            this.spin_direction = -1;
        }
        this.y_diff_bricks_ball_start = y_diff_bricks_ball_start;
        this.width_of_bricks = width_of_bricks;
        this.bricks_bottom = bricks_bottom;
        this.not_in_use = false;
        this.ball_diameter = CONSTANTS.GameBall.DIAMETER;
        this.ball_radius = CONSTANTS.GameBall.RADIUS_INT;
        this.start_x_ball = start_x_ball;
        this.start_y_ball = start_y_ball;
        this.drawImage(this.canvas_context, CONSTANTS.GameBall.COLOR);
        this.startPosition(start_x_ball, start_y_ball);
        this.top_step = start_top_step;
        this.left_step = start_left_step;
        this.speed_multiplier = speed_multiplier;
        this.showImage();
    }

    unusedBall() {
        return this.not_in_use;
    }

    setUnused() {
        this.left = CONSTANTS.GameBall.HIDE_LEFT_BALL;
        this.moveXy(CONSTANTS.GameBall.IGNORE_WIDTH);
        this.not_in_use = true;
    }

    resetToStart() {
        let {
            start_x_ball,
            start_y_ball,
            start_top_step,
            start_left_step,
            speed_multiplier
        } = GameBall.startValues(this.width_of_bricks, this.bricks_bottom, this.y_diff_bricks_ball_start);
        this.start_x_ball = start_x_ball;
        this.start_y_ball = start_y_ball;
        this.top_step = start_top_step;
        this.left_step = start_left_step;
        this.speed_multiplier = speed_multiplier;
        this.not_in_use = false;
        this.startPosition(start_x_ball, start_y_ball);
    }



    startPosition(center_x, center_y) {
        this.left = center_x - this.ball_radius;
        this.top = center_y - this.ball_radius;
        this.right = center_x + this.ball_radius;
        this.bottom = center_y + this.ball_radius;
        this.item_canvas.style.top = 0;
        this.item_canvas.style.left = 0;
        this.temp_image.style.top = 0;
        this.temp_image.style.left = 0;
    }

    ballToBricks(brick_list) {
        for (let brick_iterator = 0; brick_iterator < brick_list.size; brick_iterator++) {
            let current_brick = brick_list.get(brick_iterator);
            let ball_hit_brick = this.collideWith(current_brick);
            if (ball_hit_brick) {
                current_brick.brick_sound_fn();
                this.showImage();
                current_brick.hideBlock();
                brick_list = brick_list.delete(brick_iterator);
                this.top_step = -this.top_step;
            } else {
                this.hideImage();
            }
        }
        return brick_list;
    }

    static hitBricks(ball_list, brick_list, bricks_bottom) {
        if (brick_list.size > 0) {
            ball_list.valueSeq().forEach(function (game_ball) {
                if (game_ball.top < bricks_bottom) {
                    brick_list = game_ball.ballToBricks(brick_list);
                }
            });
        }
        return brick_list;
    }

    collideWith(other_square) {
        if (this.right < other_square.left) { //   ball | other
            return false;
        } else if (this.left > other_square.right) { //   other | ball  
            return false;
        } else if (this.top > other_square.bottom) { //  other / ball
            return false;
        } else if (this.bottom < other_square.top) { //   ball  /other 
            return false;
        }
        return true;
    }

    hitPaddle(game_paddle) {
        if (this.collideWith(game_paddle)) {
            game_paddle.paddle_sound_fn();
            this.showImage();
            let ball_h_center = Math.floor(this.left + this.ball_radius + 1);
            let [hor_offset, ver_offset] = game_paddle.stepSizes(ball_h_center);
            this.left_step = hor_offset;
            this.top_step = ver_offset;
            return true;
        } else {
            this.hideImage();
        }
        return false;
    }

    hideOffScreenBall(bottom_paddle) {
        if (this.top > bottom_paddle) {
            this.setUnused();
        }
    }

    drawImage(canvas_context, ball_color) {
        let ball_radius = CONSTANTS.GameBall.RADIUS_INT;
        canvas_context.beginPath();
        canvas_context.arc(ball_radius, ball_radius, ball_radius, 0, CONSTANTS.GameBall.ARC_OF_CIRCLE);
        canvas_context.fillStyle = ball_color;
        canvas_context.fill();

        let cross_width = CONSTANTS.GameBall.CROSS_WIDTH;
        let radius_int = CONSTANTS.GameBall.RADIUS_INT - 1;
        let ball_diameter = CONSTANTS.GameBall.DIAMETER - 1;
        canvas_context.fillStyle = GameProcs.randomRowColor();
        canvas_context.fillRect(radius_int, 0, cross_width, ball_diameter);

        canvas_context.fillRect(0, radius_int, ball_diameter, cross_width);

        canvas_context.fillStyle = 'black';
        canvas_context.fillRect(radius_int, radius_int, cross_width, cross_width);
    }

    moveXy(width_of_bricks) {
        this.spin_count = this.spin_count + 1;
        this.top += this.top_step * this.speed_multiplier;
        this.left += this.left_step * this.speed_multiplier;
        this.right = this.left + this.ball_diameter - 1;
        this.bottom = this.top + this.ball_diameter - 1;

        if ((this.left <= 0) || (this.right >= width_of_bricks)) {
            this.left_step = -this.left_step;
            this.left += this.left_step * this.speed_multiplier;
            this.left += this.left_step * this.speed_multiplier;
        } else if (this.top <= 0) {
            this.top_step = -this.top_step;
            this.top += this.top_step * this.speed_multiplier;
            this.top += this.top_step * this.speed_multiplier;
        }
        const translate_transform = " translate(" + this.left + "px," + this.top + "px) ";
        let rotate_transform;
        if (this.is_desktop){
            rotate_transform = " rotate(" + this.spin_direction + this.spin_count + "deg) ";
        }else{
            rotate_transform = "";
        }
        const translate_position = translate_transform + rotate_transform;
        this.item_canvas.style.transform = translate_position;
        this.temp_image.style.transform = translate_position;
    }


}
