class Err {
    constructor(errMsg) {
        this.error = errMsg;
    }
}

class EmptySource extends Err {
    constructor(err) {
        super(err);
        throw new Error(this.error);
    }
}

class UnclosedError extends Err {
    constructor(err) {
        super(err);
        throw new Error(this.error);
    }
}

class UnexpectedError extends Err {
    constructor(err) {
        super(err);
        throw new Error(this.error);
    }
}

class InvalidError extends Err {
    constructor(err) {
        super(err);
        throw new Error(this.error);
    }
}

export class LogError {
    constructor() {

    }

    emptySourceError(errMsg) {
        const err = new EmptySource(errMsg);
    }

    unclosedError(errMsg) {
        const err = new UnclosedError(errMsg);
    }

    unexpectedError(errMsg) {
        const err = new UnexpectedError(errMsg);
    }

    invalidError(errMsg) {
        const err = new InvalidError(errMsg);
    }
}