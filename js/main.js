const programArea = document.getElementById("program");
const outputArea = document.getElementById("output");
const runButton = document.getElementById("runBtn");



const reservedWord = ["\\", ".", "(", ")"]

/**@type {Object.<string, LambdaEq>} */
var nameSpace = {};

/**
 * @param {string[]} list 
 */
function paranEliminate(list) {
    var eliList = list.map(value => (value == "(" || value == ")") ? value : " ");
    var headEli = eliList.indexOf(" ");
    var tailEli = [...eliList].reverse().indexOf(" ");

    var nest = headEli;
    var valley = Math.min(headEli, tailEli);
    for (let i = headEli; i < eliList.length - tailEli; i++) {
        let value = eliList[i];
        if (value == "(") {
            nest++;
        } else if (value == ")") {
            nest--;
        }

        if (nest < 0) {
            return -Infinity;
        }
        if (nest < valley) {
            valley = nest;
        }
    }
    if (nest == tailEli) {
        return valley;
    } else if (nest > tailEli) {
        return Infinity;
    } else {
        return -Infinity;
    }
}

/**
 * @param {string} text 
 */
function output(text) {
    var lineText = "";
    runLines.forEach((value, index) => { lineText = `line ${value}${index == 0 ? "" : " in "}` + lineText });
    outputArea.innerText += `\n(${lineText}) ${text}`;
}
/**
 * @param {string} text 
 * @param {string} type 
 */
function error(text, type = "syntax") {
    output(type + " error: " + text);
}

var lambdaEqCount = 0;
// 0:identifier, 1:abstraction, 2:application, 3:defined, -1:error

class LambdaEq {
    /**@type {number} */
    type = 0;
    /**@type {number} */
    identifier = -1;
    /**@type {LambdaEq} */
    lambdaEq1 = undefined;
    /**@type {LambdaEq} */
    lambdaEq2 = undefined;
    /**@type {string} */
    variable = "";
    /**@type {number} */
    functionDepth = 0;

    /**
     * @param {string[]} list
     * @param {string[]} _idList
     */
    constructor(list, _idList = []) {
        if (list == undefined) {
            return;
        }

        this.functionDepth = _idList.length;

        if (list.length == 0) {
            this.type = -1; error(`some token expected`); return;
        }

        var numOfEliParan = paranEliminate(list);
        if (numOfEliParan == Infinity) {
            this.type = -1; error(`missing ')'`); return;
        } else if (numOfEliParan == -Infinity) {
            this.type = -1; error(`missing '('`); return;
        }
        for (let i = 0; i < numOfEliParan; i++) {
            list.pop();
            list.shift();
        }

        if (list.length == 1) {
            let name = list[0];
            if (reservedWord.includes(name)) {
                this.type = -1; error(`unexpected token '${name}'`); return;
            }
            if (_idList.includes(name)) {
                this.type = 0;
                this.identifier = _idList.length - [..._idList].reverse().indexOf(name) - 1;
            } else {
                this.type = 3;
                this.variable = name;
            }

        } else if (list[0] == "\\") {
            let id = list[1];
            if (reservedWord.includes(id)) {
                this.type = -1; error(`unexpected token '${id}'`); return;
            }
            if ((reservedWord.includes(list[2]) && !(list[2] == ".")) || list.length < 3) {
                this.type = -1; error(`missing '.'`); return;
            }

            _idList.push(id);
            let idNum = _idList.length - 1;
            let lambdaEq1 = undefined;
            if (list[2] == ".") {
                lambdaEq1 = new LambdaEq(list.slice(3), _idList);
            } else {
                lambdaEq1 = new LambdaEq(["\\"].concat(list.slice(2)), _idList);
            }
            _idList.pop();
            if (lambdaEq1.type == -1) {
                this.type = -1; return;
            }

            this.type = 1;
            this.identifier = idNum;
            this.lambdaEq1 = lambdaEq1;


        } else {
            let splitIndex = -1;
            let nest = 0
            for (let i = list.length - 1; i >= 0; i--) {
                let value = list[i];
                if (value == "(") {
                    nest--;
                } else if (value == ")") {
                    nest++;
                } else if (nest == 0 && value == "\\") {
                    splitIndex = i;
                }

                if (nest == 0 && splitIndex == -1) {
                    splitIndex = i;
                }

            }

            this.type = 2;
            this.lambdaEq1 = new LambdaEq(list.slice(0, splitIndex), _idList);
            this.lambdaEq2 = new LambdaEq(list.slice(splitIndex), _idList);
        }
    }

    copy() {
        let copy = new LambdaEq();
        copy.type = this.type;
        copy.identifier = this.identifier;
        copy.lambdaEq1 = this.lambdaEq1;
        copy.lambdaEq2 = this.lambdaEq2;
        copy.variable = this.variable;
        copy.functionDepth = this.functionDepth;
        return copy;
    }

    /**
     * @param {number} initialDepth 
     * @param {number[]} _idList 
     */
    depthChange(initialDepth, _idList = []) {
        var changedEq = this.copy();
        changedEq.functionDepth = initialDepth + _idList.length;
        if (this.type == 0 && _idList.includes(this.identifier)) {
            changedEq.identifier = initialDepth + _idList.indexOf(this.identifier);

        } else if (this.type == 1) {
            _idList.push(this.identifier);
            changedEq.identifier = initialDepth + _idList.length - 1;
        }

        if (this.lambdaEq1 != undefined) {
            changedEq.lambdaEq1 = this.lambdaEq1.depthChange(initialDepth, _idList);
        }
        if (this.lambdaEq2 != undefined) {
            changedEq.lambdaEq2 = this.lambdaEq2.depthChange(initialDepth, _idList);
        }

        if (this.type == 1) {
            _idList.pop();
        }

        return changedEq;
    }

    reduction() {
        if (this.type == 0) {
            return undefined;

        } else if (this.type == 1) {
            let red = this.lambdaEq1.reduction()
            if (red == undefined) {
                return undefined;

            } else {
                let subst = this.copy();
                subst.lambdaEq1 = red;
                return subst;
            }

        } else if (this.type == 2) {
            if (this.lambdaEq1.type == 1) {
                let func = this.lambdaEq1;
                return func.lambdaEq1.substitution(func.identifier, this.lambdaEq2).depthChange(this.functionDepth);

            } else {
                let red1 = this.lambdaEq1.reduction();
                if (red1 != undefined) {
                    let subst = this.copy();
                    subst.lambdaEq1 = red1;
                    return subst;
                }
                let red2 = this.lambdaEq2.reduction();
                if (red2 != undefined) {
                    let subst = this.copy();
                    subst.lambdaEq2 = red2;
                    return subst;
                }
                return undefined;
            }

        } else if (this.type == 3) {
            let lambdaEq = nameSpace[this.variable];
            let number = parseInt(this.variable);
            if (lambdaEq) {
                return lambdaEq.depthChange(this.functionDepth);
            } else if (number != NaN && number >= 0 && Math.floor(number) == number) {
                return numberLambdaEq(number).depthChange(this.functionDepth);
            } else {
                return undefined;
            }
        }
    }

    /**
     * @param {number} lambdaEqNum 
     * @param {number} identifier 
     * @param {LambdaEq} newLambdaEq 
     */
    substitution(identifier, newLambdaEq) {
        if (this.type == 0) {
            if (this.identifier == identifier) {
                return newLambdaEq.depthChange(this.functionDepth);
            } else {
                return this.copy();
            }
        } else {
            let subst = this.copy();
            if (subst.lambdaEq1 != undefined) {
                subst.lambdaEq1 = this.lambdaEq1.substitution(identifier, newLambdaEq);
            }
            if (subst.lambdaEq2 != undefined) {
                subst.lambdaEq2 = this.lambdaEq2.substitution(identifier, newLambdaEq);
            }
            return subst;
        }
    }

    /**
     * @param {boolean} _mostright
     * @returns {string}
     */
    toString(_mostright = true) {
        if (this.type == 0) {
            return `a${this.identifier}`;
        } else if (this.type == 1) {
            return `λa${this.identifier}.${this.lambdaEq1.toString()}`;
        } else if (this.type == 2) {
            let string1 = this.lambdaEq1.toString(false);
            if (this.lambdaEq1.type == 1) {
                string1 = `(${string1})`;
            }
            let string2 = this.lambdaEq2.toString();
            if ((!_mostright && this.lambdaEq2.type == 1) || this.lambdaEq2.type == 2) {
                string2 = `(${string2})`;
            }
            return string1 + " " + string2;
        } else if (this.type == 3) {
            return this.variable;
        } else {
            return "error";
        }
    }

    display() {
        var displayText = "";
        Object.keys(display).forEach(key => {
            var result = display[key](this);
            if (result != undefined) {
                displayText += `\n${result} (as ${key})`;
            }
        });

        return displayText;
    }
}

/**
 * @param {string[]} list 
 */
function listRun(list) {
    var defCount = list.filter(value => (value == "def")).length;
    var defIndex = list.indexOf("def");

    if (defCount > 1) {
        error("unexpected token: 'def'");
    } else if (defCount == 1) {

        if (defIndex == 0) {
            if (list.length == 1) {
                error(`some token expected`); return;
            }
            if (list.length > 2) {
                error(`unexpected token '${list[2]}'`); return;
            }

            let module = modules[list[1]];
            if (module) {
                run(module);
            } else {
                error(`no such module '${list[1]}'`, "import"); return;
            }

        } else if (defIndex == 1) {
            if (reservedWord.includes(list[0])) {
                error(`unexpected token: '${list[0]}'`); return;
            }

            let variableName = list[0];
            let lambdaEq = new LambdaEq(list.slice(2));
            if (lambdaEq.type == -1) {
                return;
            }
            nameSpace[variableName] = lambdaEq;

        } else {
            error("unexpected token: 'def'"); return;
        }

    } else {
        let lambdaEq = new LambdaEq(list);
        let count = 0;
        while (true) {
            console.log(lambdaEq.toString());
            let reducted = lambdaEq.reduction();
            if (reducted == undefined) {
                break;
            }
            lambdaEq = reducted;

            count++;
            if (count == 100000) {
                let reductString = reducted.toString();
                if (reductString.length > 100) {
                    reductString = reductString.slice(0, 100) + "..."
                }
                error(`too many reduction: '${reductString}'`, "processing"); return;
            }
        }

        if (lambdaEq.type != -1) {
            output(lambdaEq.toString() + lambdaEq.display());
        }
        return;
    }
}

/**
 * @param {string} program 
 */
function lineRun(program) {
    var list = program.replaceAll(/[\\\.()]/g, match => ` ${match} `).split(/\s/).filter(value => (value != ""));
    if (list.length == 0) {
        return;
    }
    try {
        listRun(list);
    } catch (innerError) {
        error(innerError, "inner");
        console.error(innerError);
    }
}

var runLines = [];
/**
 * @param {string} program
 */
function run(program) {
    runLines.push(1);
    program.split("\n").forEach(value => {
        lineRun(value);
        runLines[runLines.length - 1]++;
    });
    runLines.pop();
}

function reset() {
    nameSpace = {};
    outputArea.innerText = "";
}

runButton.addEventListener("click", () => {
    reset();
    run(programArea.value);
});



function numberLambdaEq(number) {
    var M = new LambdaEq();
    M.type = 0;
    M.identifier = 1;
    M.functionDepth = 2;
    for (let i = 0; i < number; i++) {
        let newM = new LambdaEq();
        newM.type = 2;
        newM.functionDepth = 2;

        let s = new LambdaEq();
        s.type = 0;
        s.identifier = 0;
        s.functionDepth = 2;

        newM.lambdaEq1 = s;
        newM.lambdaEq2 = M

        M = newM;
    }

    let zfunc = new LambdaEq();
    zfunc.type = 1;
    zfunc.identifier = 1;
    zfunc.lambdaEq1 = M;
    zfunc.functionDepth = 1;

    let sfunc = new LambdaEq();
    sfunc.type = 1;
    sfunc.identifier = 0;
    sfunc.lambdaEq1 = zfunc;
    sfunc.functionDepth = 0;

    return sfunc;
}

const display = {
    boolean: booleanDisplay,
    int: intDisplay,
    pair: pairDisplay,
    list: listDisplay

}

/**
 * @param {LambdaEq} lambdaEq
 */
function booleanDisplay(lambdaEq) {
    if (
        lambdaEq.type == 1 &&
        lambdaEq.lambdaEq1.type == 1 &&
        lambdaEq.lambdaEq1.lambdaEq1.type == 0
    ) {
        let t = lambdaEq.identifier;
        let f = lambdaEq.lambdaEq1.identifier

        if (lambdaEq.lambdaEq1.lambdaEq1.identifier == t) {
            return true;
        } else if (lambdaEq.lambdaEq1.lambdaEq1.identifier == f) {
            return false;
        } else {
            return undefined;
        }
    } else {
        return undefined;
    }
}

/**
 * @param {LambdaEq} lambdaEq
 */
function intDisplay(lambdaEq) {
    if (
        lambdaEq.type == 1 &&
        lambdaEq.lambdaEq1.type == 1
    ) {
        let s = lambdaEq.identifier;
        let z = lambdaEq.lambdaEq1.identifier

        let resultInt = 0;
        let currentLambdaEq = lambdaEq.lambdaEq1.lambdaEq1;
        while (true) {
            if (
                currentLambdaEq.type == 0 &&
                currentLambdaEq.identifier == z
            ) {
                return resultInt;
            } else if (
                currentLambdaEq.type == 2 &&
                currentLambdaEq.lambdaEq1.type == 0 &&
                currentLambdaEq.lambdaEq1.identifier == s
            ) {
                currentLambdaEq = currentLambdaEq.lambdaEq2;
                resultInt++;
            } else {
                return undefined;
            }
        }

    } else if (
        lambdaEq.type == 1 &&
        lambdaEq.lambdaEq1.type == 0 &&
        lambdaEq.identifier == lambdaEq.lambdaEq1.identifier
    ) {
        return 1;
    } else {
        return undefined;
    }
}

/**
 * @param {LambdaEq} lambdaEq 
 */
function pairDisplay(lambdaEq) {
    if (
        lambdaEq.type == 1 &&
        lambdaEq.lambdaEq1.type == 2 &&
        lambdaEq.lambdaEq1.lambdaEq1.type == 2 &&
        lambdaEq.lambdaEq1.lambdaEq1.lambdaEq1.type == 0 &&
        lambdaEq.identifier == lambdaEq.lambdaEq1.lambdaEq1.lambdaEq1.identifier
    ) {
        let result1 = lambdaEq.lambdaEq1.lambdaEq1.lambdaEq2.display();
        if (result1 == "") {
            result1 = "\n" + lambdaEq.lambdaEq1.lambdaEq1.lambdaEq2.depthChange(0).toString();
        }
        let result2 = lambdaEq.lambdaEq1.lambdaEq2.display();
        if (result2 == "") {
            result2 = "\n" + lambdaEq.lambdaEq1.lambdaEq2.depthChange(0).toString();
        }
        return `(${result1}\n,${result2}\n)`;
    } else {
        return undefined;
    }
}

/**
 * @param {LambdaEq} lambdaEq 
 * @returns 
 */
function listDisplay(lambdaEq) {
    if (
        lambdaEq.type == 1 &&
        lambdaEq.lambdaEq1.type == 1
    ) {
        let c = lambdaEq.identifier;
        let n = lambdaEq.lambdaEq1.identifier;

        let resultList = "[";
        let currentLambdaEq = lambdaEq.lambdaEq1.lambdaEq1;
        while (true) {
            if (
                currentLambdaEq.type == 0 &&
                currentLambdaEq.identifier == n
            ) {
                if (resultList == "[") {
                    return "[]";
                } else {
                    return resultList.slice(0, -1) + "]";
                }
            } else if (
                currentLambdaEq.type == 2 &&
                currentLambdaEq.lambdaEq1.type == 2 &&
                currentLambdaEq.lambdaEq1.lambdaEq1.type == 0 &&
                currentLambdaEq.lambdaEq1.lambdaEq1.identifier == c
            ) {
                let result = currentLambdaEq.lambdaEq1.lambdaEq2.display();
                if (result == "") {
                    resultList += "\n" + currentLambdaEq.lambdaEq1.lambdaEq2.toString();
                } else {
                    resultList += result;
                }
                resultList += "\n,"

                currentLambdaEq = currentLambdaEq.lambdaEq2;
            } else {
                return undefined;
            }
        }

    } else {
        return undefined;
    }
}


/**@type {Object.<string, string>} */
const modules = {
    st: `
        true def \\t f.t
        false def \\t f.f

        and def \\b1 b2.b1 b2 false
        or def \\b1 b2.b1 true b2
        not def \\b.b false true

        pair def \\M N f.f M N
        fst def \\P.P true
        snd def \\P.P false

        empty def \\c n.n
        head def \\L.L (\\x y.x) none
        reverse def \\L.L (\\x y c n.y c (c x n)) (\\c n.n)
        end def \\L.head (reverse L)
        tail def \\L.L (\\x y c' c n.c' x (y c c n)) (\\c' c n.n) (\\x y.y)
        cons def \\x L c n.c x (L c n)
        join def \\L1 L2 c n.L1 c (L2 c n)
        map def \\L f.L (\\x y c n.c (f x) (y c n)) (\\c n.n)

        Y def \\f.(\\x.f(x x))(\\x.f(x x))`,
    number: `
        def st

        succ def \\n s z.s (n s z)
        + def \\m n.n succ m
        * def \\m n s.n (m s)
        ^ def \\m n.n m
        is0 def \\n.n (\\b.false) true
        leq def \\m n.is0(- m n)
        = def \\m n.and (leq m n) (leq n m)
        pred def \\n.n (\\x s' s z.s'(x s s z)) (\\s' s z.z) (\\x.x)
        - def \\m n.n pred m

        length def \\L.L (\\x y.succ y) 0
        at def \\L n.snd (L (\\x y.(= (fst y) (- (length L) n)) (pair (succ (fst y)) x) (pair (succ (fst y)) (snd y))) (pair 1 none))
        indexof def \\L n.L (\\x y.(= x n) 0 (succ y)) 0
        includes def \\L n.L (\\x y.or (= x n) y) false

        sum def \\L.L + 0
        prod def \\L.L * 1
        max def \\L.L (\\x y.(leq x y) y x) 0
        difflist def \\L.map L (\\x.- (max L) x)
        min def \\L.- (max L) (max (difflist L))

        fact def Y (\\f n.is0 n 1 (* n (f(pred n))))
        mod def Y (\\f m n.not (leq n m) m (f (- m n) n)) 
        gcd def Y (\\f m n.is0 n m (f n (mod m n)))
    `
};