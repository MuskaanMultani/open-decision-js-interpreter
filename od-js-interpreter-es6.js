/*!
 * Open Decision JavaScript Interpreter v0.1
 * https://open-decision.org/
 *
 * Copyright Finn Schädlich, Open Decision Project
 * Released under the MIT license
 * https://github.com/fbennets/open-decision/blob/master/LICENSE
 *
 * Date: 2020-04-03
 */

window.openDecision = (function(){
"use strict";
// The node of the tree the user is currently seeing
let currentNode,
// The decision tree that is being rendered
tree,
// Contains the html to display the tree name
preString,
// Used to log the nodes shown and answers given by the user, used for history
log,
// The div-container in which the tree is rendered in (where the question, buttons etc. is shown)
selectedDiv,
// Boolean to determine if the device can vibrate
supportsVibration,
// Object  to expose the internal functions
 expose = {},
 //CSS for UI elements
 css = {};

 //version of  the Interpreter
 const COMPATIBLE_VERSIONS = [0.1],
 //default CSS for UI elements
 defaultCss = {
   heading: "",
   inputContainer: "",
   answerButton: "btn btn-primary ml-2",
   answerList: "",
   numberInput: "",
   dateInput: "",
   freeText: {
     short: "",
     long: "",
     number: "",
   },
   controls: {
     submitButton: "btn btn-primary ml-2 mt-3",
     restartButton: "btn btn-primary ml-2 mt-3",
     backButton: "btn btn-primary ml-2 mt-3",
   }
 };


expose.init = function (path, divId, customCss = {}) {
  tree = path;
  selectedDiv = divId;
  css = {
    ...defaultCss,
    ...customCss,
  }

  try{
    window.navigator.vibrate(1);
    supportsVibration = true;
  }catch(e){supportsVibration = false;
  }

  let compatible = false;
  for (var i=0;i<COMPATIBLE_VERSIONS.length;i++){
    if (COMPATIBLE_VERSIONS[i] === tree.header.version){
      compatible = true
    }
  }

  if (!compatible){
    document.getElementById(selectedDiv).innerHTML = `The provided file uses the Open Decision dataformat version ${tree.header.version}. This library only supports ${COMPATIBLE_VERSIONS}.`;
    throw {
    name: "IncompatibleVersion",
    message: `The provided file uses the Open Decision dataformat version ${tree.header.version}. This library only supports ${COMPATIBLE_VERSIONS}.`,
    toString: function() {
      return this.name + ": " + this.message;
    }
  }
}
  displayTree();
};

// Listener for hashchange in the URL if the user clicks the browser's back-button
// The hash tells us the node name, that is currently displayed
window.onhashchange = function() {
  if ((currentNode != location.hash.replace('#','')) && (location.hash.length > 0)) {
        if (log.nodes.length > 0) {
          //Go back one step
          currentNode = location.hash.replace('#','');
          log.nodes.pop();
          delete log.answers[currentNode];
        } else {
          // Else restart
          currentNode = tree.header.start_node;
          log = {'nodes': [], 'answers': {}};
        }
        displayNode();
    }
};

// Check for vars that need to be replaced in displayNode
//Keep track of all inputs in this one node

function displayTree  () {
  currentNode = tree.header.start_node;
  preString = `<h3 class="${css.heading}">${tree.header.tree_name}</h3><br>`;
  log = {'nodes': [], 'answers': {}}
  displayNode()
};

function displayNode () {
  location.hash = currentNode;
  let question = tree[currentNode].text;

//Replace vars
  //Match double square brackets
  let regExp = /\[\[([^\]]+)]]/g;
  let match = regExp.exec(question);
  while (match != null) {
    let answer;
    match[1] = match[1].trim();
     let period = match[1].indexOf('.');
     if (period !== -1){
       let node = match[1].substring(0, period);
       let id = match[1].substring(period+1);
       answer = (node in log.answers) ? log.answers[node][id] : "MISSING";
     } else {
      answer = (match[1] in log.answers) ? log.answers[match[1]] : "MISSING";
     }
    if (typeof answer === 'number'){
      try {
        let answerText = tree[match[1]].inputs[0].options[answer];
        if (answerText !== undefined) {
          answer = answerText;
        }
      } catch {
      }
    } else if (typeof answer === 'object'){
      answer = log.answers[match[1]].a
    }
    ;
    question = question.replace(match[0], answer);
    match = regExp.exec(question);
  }
  let string = `${preString}${question}<br><div id="od-input-div" class="${css.inputContainer}">`;
  var inputCounter = {
    'buttonsCount': 0,
    'listCount': 0,
    'numberCount': 0,
    'dateCount': 0,
    'freeTextCount': 0,
  };
  for(var j=0;j<tree[currentNode].inputs.length;j++) {
  if (tree[currentNode].inputs[j].type ==='button') {
    for (let i = 0; i < tree[currentNode].inputs[j].options.length; i++) {
        string += `<button type="button" id="answer-button" class="${css.answerButton}" data-index="${j}" value="${i}">${tree[currentNode].inputs[j].options[i]}</button>`
      }
      inputCounter['buttonsCount'] = +1;
    }
  else if (tree[currentNode].inputs[j].type === 'list') {
    string += `<select id="list-select" class="od-input list-select ${css.answerList}" data-index="${j}">`;
    for (let i = 0; i < tree[currentNode].inputs[j].options.length; i++) {
      string += `<option value=${i}>${tree[currentNode].inputs[j].options[i]}</option>`
      }
      string += '</select>'
      inputCounter['listCount'] = +1;
    }
  else if (tree[currentNode].inputs[j].type === 'number') {
  string += `<input type="number" id="number-input" class="od-input number-input ${css.numberInput}" data-index="${j}">`;
  inputCounter['numberCount'] = +1;
}
else if (tree[currentNode].inputs[j].type === 'date') {
  string += `<input type="number" id="date-input" class="od-input date-input ${css.dateInput}" data-index="${j}">`;
  inputCounter['dateCount'] = +1;
}

else if (tree[currentNode].inputs[j].type === 'free_text') {
  if (tree[currentNode].inputs[j].validation === 'short_text') {
    string += `<label for="${tree[currentNode].inputs[j].id}" >${tree[currentNode].inputs[j].label}<br><input type="text" id="${tree[currentNode].inputs[j].id}" class="free-text short-text od-input ${css.freeText.short}" data-index="${j}"></label>`;
  } else if (tree[currentNode].inputs[j].validation === 'long_text'){
    string += `<textarea id="${tree[currentNode].inputs[j].id}" class="free-text long-text  od-input ${css.freeText.long}" data-index="${j}" rows="4" cols="10"></textarea>`;
  } else if (tree[currentNode].inputs[j].validation === 'number'){
  string += `<input type="number" id="${tree[currentNode].inputs[j].id}" class="free-text number od-input ${css.freeText.number}" data-index="${j}">`;
}
inputCounter['freeTextCount'] = +1;
}
};
if ((tree[currentNode].inputs.length !== 0)&&(tree[currentNode].inputs[0].type !== 'button')){
  string += `<br><button type="button" class="${css.controls.submitButton}" id="submit-button">Submit</button>`;
}
  string += `</div><br><button type="button" class=" ${css.controls.restartButton}" id="restart-button">Restart</button><button type="button" class="${css.controls.backButton}" id="back-button">Back</button>`;
  document.getElementById(selectedDiv).innerHTML = string;
  document.addEventListener( "click", listener );
};


function listener (event) {
 let target = event.target || event.srcElement;

//Haptic Feedback on mobile devices
if (supportsVibration){
  window.navigator.vibrate(50);
}

  if (target.id == 'answer-button') {
    let answerId = parseInt(target.value);
    checkAnswer(answerId, 'button');
}
  else if (target.id == 'submit-button') {
    let inputs = document.getElementById('od-input-div').querySelectorAll('.od-input');
    let answer = {};
    inputs.forEach(function(i){
      if (i.classList.contains('list-select')){
      let inputIndex = parseInt(i.getAttribute("data-index"));
      answer['a'] = tree[currentNode].inputs[inputIndex].options[parseInt(i.value)];
      } else if (i.classList.contains('number-input')){
        answer['a'] = i.value;
      } else if (i.classList.contains('date-input')){
        answer['a'] = i.value;
      } else if (i.classList.contains('free-text')){
          answer[i.id] = i.value;
      }});
  checkAnswer(answer);
  } else if (target.id == 'restart-button') {
    currentNode = tree.header.start_node;
    log = {'nodes': [], 'answers': {}};
    displayNode();

  } else if (target.id == 'back-button') {
      if (log.nodes.length > 0) {
        delete log.answers[currentNode];
        currentNode = log.nodes.pop();
      } else {
        currentNode = tree.header.start_node;
        log = {'nodes': [], 'answers': {}};
      }
    displayNode();
  }
};

function checkAnswer (answer, inputType) {
  log['nodes'].push(currentNode);
  log['answers'][currentNode]=answer;

  if (Object.keys(tree[currentNode].rules).length === 0) {
    if ('default' in tree[currentNode].destination){
      // If only free text
      currentNode = tree[currentNode].destination['default'];
    } else {
      // If only buttons
      currentNode = tree[currentNode].destination[answer]
    }
  } else {
    // If we have rules
    let rule = jsonLogic.apply(tree[currentNode].rules, answer);
      currentNode = tree[currentNode].destination[rule];
  }
  console.log(log);
  displayNode();
};
// To do:
// Save/download progress function
// Validate user input and give errors
// JS translation
 return expose;
}());
