// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
"use strict";

const functions = require("firebase-functions");
const { WebhookClient } = require("dialogflow-fulfillment");
const bent = require("bent");
const getJSON = bent("json");
let localDatas = [];

process.env.DEBUG = "dialogflow:debug"; // enables lib debugging statements

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(
  (request, response) => {
    const agent = new WebhookClient({ request, response });
    console.log(
      "Dialogflow Request headers: " + JSON.stringify(request.headers)
    );
    console.log("Dialogflow Request body: " + JSON.stringify(request.body));

    function welcome(agent) {
      agent.add(`Welcome to my agent!`);
    }

    function fallback(agent) {
      agent.add(`I didn't understand`);
      agent.add(`I'm sorry, can you try again?`);
    }

    function worldWideStats(agent) {
      const type = agent.parameters.type;
      return getJSON(
        "https://coronavirus-tracker-api.herokuapp.com/v2/latest?source=jhu"
      )
        .then((result) => {
          if (type.length >= 3) {
            agent.add(
              "There are currently " +
                result.latest.confirmed +
                " confirmed cases, " +
                result.latest.deaths +
                " confirmed deaths and " +
                result.latest.recovered +
                " patients recovered from COVID-19."
            );
            return;
          } else {
            let x;
            for (x of type) {
              switch (x) {
                case "confirmed":
                  agent.add(
                    "There are currently " +
                      result.latest.confirmed +
                      " confirmed cases of COVID-19."
                  );
                  break;
                case "deaths":
                  agent.add(
                    "There are currently " +
                      result.latest.deaths +
                      " confirmed deaths of COVID-19."
                  );
                  break;
                case "recovered":
                  agent.add(
                    "There are currently " +
                      result.latest.recovered +
                      " patients of COVID-19."
                  );
                  break;
                default:
                  //All conditions
                  agent.add(
                    "There are currently " +
                      result.latest.confirmed +
                      " confirmed cases," +
                      result.latest.deaths +
                      "confirmed deaths and " +
                      result.latest.recovered +
                      " patients recovered from COVID-19."
                  );
              }
            }
          }
        })
        .catch((error) => {
          console.log(error);
        });
    }

    function locationLatestStats(agent) {
      if (agent.parameters.country.length === 0) {
        if (agent.parameters.state.length > 0) {
          return getJSON(
            "https://coronavirus-tracker-api.ruizlab.org/v2/locations?source=csbs"
          )
            .then((result) => {
              if (agent.parameters.county.length == 0) {
                for (let astate of agent.parameters.state) {
                  for (let serverState of result.locations) {
                    if (
                      astate.toUpperCase() ===
                      serverState.province.toUpperCase()
                    ) {
                      localDatas.push(serverState);
                    }
                  }
                }
                let resultObject = {};
                if (agent.parameters.type.includes("all")) {
                  let allTypes = ["confirmed", "deaths", "recovered"];
                  for (let astate of agent.parameters.state) {
                    for (let atype of allTypes) {
                      let sum = 0;
                      for (let object of localDatas) {
                        if (
                          object.province.toUpperCase() === astate.toUpperCase()
                        ) {
                          sum = sum + object.latest[atype];
                        }
                      }
                      if (astate in resultObject) {
                        resultObject[astate][atype] = sum;
                      } else {
                        resultObject[astate] = { [atype]: sum };
                      }
                    }
                  }
                } else {
                  for (let astate of agent.parameters.state) {
                    for (let atype of agent.parameters.type) {
                      let sum = 0;
                      for (let object of localDatas) {
                        if (
                          object.province.toUpperCase() === astate.toUpperCase()
                        ) {
                          sum = sum + object.latest[atype];
                        }
                      }
                      if (astate in resultObject) {
                        resultObject[astate][atype] = sum;
                      } else {
                        resultObject[astate] = { [atype]: sum };
                      }
                    }
                  }
                }
                agent.add("As per latest stats");
                for (const property in resultObject) {
                  agent.add("In " + property + " there are");
                  for (const theType in resultObject[property]) {
                    agent.add(
                      resultObject[property][theType] + " " + theType + " cases"
                    );
                  }
                }
              } else {
                let countyName = agent.parameters.county[0].split(" ")[0];
                for (let serverState of result.locations) {
                  if (
                    countyName.toUpperCase() ===
                      serverState.county.toUpperCase() &&
                    serverState.province.toUpperCase() ===
                      agent.parameters.state[0].toUpperCase()
                  ) {
                    localDatas.push(serverState);
                  }
                }
                if (agent.parameters.type.includes("all")) {
                  let allType = ["confirmed", "deaths", "recovered"];
                  agent.add("As per the latest data");
                  agent.add("in " + agent.parameters.county + " there are ");
                  for (let atype of allType) {
                    agent.add(atype + localDatas[0].latest[atype]);
                  }
                  agent.add("cases");
                } else {
                  agent.add("As per the latest data");
                  agent.add("in " + agent.parameters.county[0] + " there are ");
                  for (let atype of agent.parameters.type) {
                    agent.add(atype + localDatas[0].latest[atype]);
                  }
                  agent.add("cases");
                }
              }
            })
            .catch((error) => {
              console.log(error);
            });
        }
      } else {
        return getJSON(
          "https://coronavirus-tracker-api.ruizlab.org/all?source=jhu"
        )
          .then((result) => {
            agent.add("As per the latest data.");
            for (let acountry of agent.parameters.country) {
              agent.add("For " + acountry.name + " there are ");
              for (let atype of agent.parameters.type) {
                switch (atype) {
                  case "recovered":
                    // do something
                    for (let obj of result.recovered.locations) {
                      if (obj.country === acountry.name) {
                        agent.add(obj.latest + " recovered");
                      }
                    }
                    break;
                  case "confirmed":
                    //do something
                    for (let obj of result.confirmed.locations) {
                      if (obj.country == acountry.name) {
                        agent.add(obj.latest + " confirmed");
                      }
                    }
                    break;
                  case "deaths":
                    //do something
                    for (let obj of result.deaths.locations) {
                      if (obj.country === acountry.name) {
                        agent.add(obj.latest + " deaths");
                      }
                    }
                    break;
                  default:
                    for (let obj of result.confirmed.locations) {
                      if (obj.country == acountry.name) {
                        agent.add(obj.latest + " confirmed");
                      }
                    }
                    for (let obj of result.recovered.locations) {
                      if (obj.country === acountry.name) {
                        agent.add(obj.latest + " recovered");
                      }
                    }
                    for (let obj of result.deaths.locations) {
                      if (obj.country === acountry.name) {
                        agent.add(obj.latest + " deaths");
                      }
                    }
                    break;
                }
              }
              agent.add(" cases");
            }
          })
          .catch((error) => {
            console.log(error);
          });
      }
    }
    function locationDateSpecific(agent) {
      if (agent.parameters.date) {
        let mDate = new Date(agent.parameters.date);
        mDate.setHours(0, 0, 0, 0);
        let currDate = new Date();
        if (mDate.getTime() > currDate.getTime()) {
          agent.add("future date");
          let pastDate = mDate.getDate() - 7;
          mDate.setDate(pastDate);
        }
        if (
          agent.parameters.type.length >= 3 ||
          agent.parameters.type.includes("all")
        ) {
          return getJSON(
            "https://coronavirus-tracker-api.ruizlab.org/all?source=jhu"
          )
            .then((result) => {
              agent.add("As per the latest data.");
              for (let acountry of agent.parameters.country) {
                agent.add("For " + acountry.name + " there are ");
                for (let obj of result.confirmed.locations) {
                  if (obj.country === acountry.name) {
                    let sum = 0;
                    let latestCount = obj.latest;
                    for (let hist in obj.history) {
                      let sDate = new Date(hist);
                      if (sDate.getTime() == mDate.getTime()) {
                        sum = latestCount - obj.history[hist];
                      }
                    }
                    agent.add(sum + " confirmed");
                  }
                }
                for (let obj of result.recovered.locations) {
                  if (obj.country === acountry.name) {
                    let sum = 0;
                    let latestCount = obj.latest;
                    for (let hist in obj.history) {
                      let sDate = new Date(hist);
                      if (sDate.getTime() == mDate.getTime()) {
                        sum = latestCount - obj.history[hist];
                      }
                    }
                    agent.add(sum + " recovered");
                  }
                }
                for (let obj of result.deaths.locations) {
                  if (obj.country === acountry.name) {
                    let sum = 0;
                    let latestCount = obj.latest;
                    for (let hist in obj.history) {
                      let sDate = new Date(hist);
                      if (sDate.getTime() == mDate.getTime()) {
                        sum = latestCount - obj.history[hist];
                      }
                    }
                    agent.add(sum + " deaths");
                  }
                }
                agent.add(" cases");
              }
            })
            .catch((error) => {
              console.log(error);
            });
        } else {
          return getJSON(
            "https://coronavirus-tracker-api.ruizlab.org/all?source=jhu"
          )
            .then((result) => {
              agent.add("As per the latest data.");
              for (let acountry of agent.parameters.country) {
                agent.add("For " + acountry.name + " there are ");
                for (let atype of agent.parameters.type) {
                  switch (atype) {
                    case "recovered":
                      // do something
                      for (let obj of result.recovered.locations) {
                        if (obj.country === acountry.name) {
                          let sum = 0;
                          let latestCount = obj.latest;
                          for (let hist in obj.history) {
                            let sDate = new Date(hist);
                            if (sDate.getTime() == mDate.getTime()) {
                              sum = latestCount - obj.history[hist];
                            }
                          }
                          agent.add(sum + " recovered");
                        }
                      }
                      break;
                    case "confirmed":
                      //do something
                      for (let obj of result.confirmed.locations) {
                        if (obj.country === acountry.name) {
                          let sum = 0;
                          let latestCount = obj.latest;
                          for (let hist in obj.history) {
                            let sDate = new Date(hist);
                            if (sDate.getTime() == mDate.getTime()) {
                              sum = latestCount - obj.history[hist];
                            }
                          }
                          agent.add(sum + " confirmed");
                        }
                      }
                      break;
                    case "deaths":
                      //do something
                      for (let obj of result.deaths.locations) {
                        if (obj.country === acountry.name) {
                          let sum = 0;
                          let latestCount = obj.latest;
                          for (let hist in obj.history) {
                            let sDate = new Date(hist);
                            if (sDate.getTime() == mDate.getTime()) {
                              sum = latestCount - obj.history[hist];
                            }
                          }
                          agent.add(sum + " deaths");
                        }
                      }
                      break;
                    default:
                      // for (let obj of result.confirmed.locations) {
                      //   if (obj.country === acountry.name) {
                      //     let sum = 0;
                      //     let latestCount = obj.latest;
                      //     for (let hist in obj.history) {
                      //       let sDate = new Date(hist);
                      //       if (sDate.getTime() == mDate.getTime()) {
                      //         sum = latestCount - obj.history[hist];
                      //       }
                      //     }
                      //     agent.add(sum + " confirmed");
                      //   }
                      // }
                      // for (let obj of result.recovered.locations) {
                      //   if (obj.country === acountry.name) {
                      //     let sum = 0;
                      //     let latestCount = obj.latest;
                      //     for (let hist in obj.history) {
                      //       let sDate = new Date(hist);
                      //       if (sDate.getTime() == mDate.getTime()) {
                      //         sum = latestCount - obj.history[hist];
                      //       }
                      //     }
                      //     agent.add(sum + " recovered");
                      //   }
                      // }
                      // for (let obj of result.deaths.locations) {
                      //   if (obj.country === acountry.name) {
                      //     let sum = 0;
                      //     let latestCount = obj.latest;
                      //     for (let hist in obj.history) {
                      //       let sDate = new Date(hist);
                      //       if (sDate.getTime() == mDate.getTime()) {
                      //         sum = latestCount - obj.history[hist];
                      //       }
                      //     }
                      //     agent.add(sum + " deaths");
                      //   }
                      // }
                      agent.add("default case hit");
                      break;
                  }
                }
                agent.add(" cases");
              }
            })
            .catch((error) => {
              console.log(error);
            });
        }
      } else if (agent.parameters["date-period"]) {
        let startDate = new Date(agent.parameters.period.startDate);
        let endDate = new Date(agent.parameters.period.endDate);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);
        // let currDate = new Date();
        // if (mDate.getTime() > currDate.getTime()) {
        //   agent.add("future date");
        //   let pastDate = mDate.getDate() - 7;
        //   mDate.setDate(pastDate);
        // }
        if (
          agent.parameters.type.length >= 3 ||
          agent.parameters.type.includes("all")
        ) {
          return getJSON(
            "https://coronavirus-tracker-api.ruizlab.org/all?source=jhu"
          )
            .then((result) => {
              agent.add("As per the latest data.");
              for (let acountry of agent.parameters.country) {
                agent.add("For " + acountry.name + " there are ");
                for (let obj of result.confirmed.locations) {
                  if (obj.country === acountry.name) {
                    let sum = 0;
                    let startValue = 0;
                    let endValue = 0;
                    // let latestCount = obj.latest;
                    for (let hist in obj.history) {
                      let sDate = new Date(hist);
                      if (
                        sDate.getTime() == startDate.getTime() ||
                        sDate.getTime() == endDate.getTime()
                      ) {
                        if (sDate.getTime() == startDate.getTime()) {
                          startValue = obj.history[hist];
                        } else if (sDate.getTime() == endDate.getTime()) {
                          endValue = obj.history[hist];
                        }
                      }
                    }
                    sum = endValue - startValue;
                    agent.add(sum + " confirmed");
                  }
                }
                for (let obj of result.recovered.locations) {
                  if (obj.country === acountry.name) {
                    let sum = 0;
                    let startValue = 0;
                    let endValue = 0;
                    // let latestCount = obj.latest;
                    for (let hist in obj.history) {
                      let sDate = new Date(hist);
                      if (
                        sDate.getTime() == startDate.getTime() ||
                        sDate.getTime() == endDate.getTime()
                      ) {
                        if (sDate.getTime() == startDate.getTime()) {
                          startValue = obj.history[hist];
                        } else if (sDate.getTime() == endDate.getTime()) {
                          endValue = obj.history[hist];
                        }
                      }
                    }
                    sum = endValue - startValue;
                    agent.add(sum + " recovered");
                  }
                }
                for (let obj of result.deaths.locations) {
                  if (obj.country === acountry.name) {
                    let sum = 0;
                    let startValue = 0;
                    let endValue = 0;
                    // let latestCount = obj.latest;
                    for (let hist in obj.history) {
                      let sDate = new Date(hist);
                      if (
                        sDate.getTime() == startDate.getTime() ||
                        sDate.getTime() == endDate.getTime()
                      ) {
                        if (sDate.getTime() == startDate.getTime()) {
                          startValue = obj.history[hist];
                        } else if (sDate.getTime() == endDate.getTime()) {
                          endValue = obj.history[hist];
                        }
                      }
                    }
                    sum = endValue - startValue;
                    agent.add(sum + " deaths");
                  }
                }
                agent.add(" cases");
              }
            })
            .catch((error) => {
              console.log(error);
            });
        } else {
          return getJSON(
            "https://coronavirus-tracker-api.ruizlab.org/all?source=jhu"
          )
            .then((result) => {
              agent.add("As per the latest data.");
              for (let acountry of agent.parameters.country) {
                agent.add("For " + acountry.name + " there are ");
                for (let atype of agent.parameters.type) {
                  switch (atype) {
                    case "recovered":
                      // do something
                      for (let obj of result.recovered.locations) {
                        if (obj.country === acountry.name) {
                          let sum = 0;
                          let startValue = 0;
                          let endValue = 0;
                          // let latestCount = obj.latest;
                          for (let hist in obj.history) {
                            let sDate = new Date(hist);
                            if (
                              sDate.getTime() == startDate.getTime() ||
                              sDate.getTime() == endDate.getTime()
                            ) {
                              if (sDate.getTime() == startDate.getTime()) {
                                startValue = obj.history[hist];
                              } else if (sDate.getTime() == endDate.getTime()) {
                                endValue = obj.history[hist];
                              }
                            }
                          }
                          sum = endValue - startValue;
                          agent.add(sum + " recovered");
                        }
                      }
                      break;
                    case "confirmed":
                      //do something
                      for (let obj of result.confirmed.locations) {
                        if (obj.country === acountry.name) {
                          let sum = 0;
                          let startValue = 0;
                          let endValue = 0;
                          // let latestCount = obj.latest;
                          for (let hist in obj.history) {
                            let sDate = new Date(hist);
                            if (
                              sDate.getTime() == startDate.getTime() ||
                              sDate.getTime() == endDate.getTime()
                            ) {
                              if (sDate.getTime() == startDate.getTime()) {
                                startValue = obj.history[hist];
                              } else if (sDate.getTime() == endDate.getTime()) {
                                endValue = obj.history[hist];
                              }
                            }
                          }
                          agent.add(sum + " confirmed");
                        }
                      }
                      break;
                    case "deaths":
                      //do something
                      for (let obj of result.deaths.locations) {
                        if (obj.country === acountry.name) {
                          let sum = 0;
                          let endValue = 0;
                          let startValue = 0;
                          // let latestCount = obj.latest;
                          for (let hist in obj.history) {
                            let sDate = new Date(hist);
                            if (
                              sDate.getTime() >= startDate.getTime() &&
                              sDate.getTime() <= endDate.getTime()
                            ) {
                              sum = sum + obj.history[hist];
                            }
                          }
                          sum = endValue - startValue;
                          agent.add(sum + " deaths");
                        }
                      }
                      break;
                    default:
                      // for (let obj of result.confirmed.locations) {
                      //   if (obj.country === acountry.name) {
                      //     let sum = 0;
                      //     let latestCount = obj.latest;
                      //     for (let hist in obj.history) {
                      //       let sDate = new Date(hist);
                      //       if (sDate.getTime() == mDate.getTime()) {
                      //         sum = latestCount - obj.history[hist];
                      //       }
                      //     }
                      //     agent.add(sum + " confirmed");
                      //   }
                      // }
                      // for (let obj of result.recovered.locations) {
                      //   if (obj.country === acountry.name) {
                      //     let sum = 0;
                      //     let latestCount = obj.latest;
                      //     for (let hist in obj.history) {
                      //       let sDate = new Date(hist);
                      //       if (sDate.getTime() == mDate.getTime()) {
                      //         sum = latestCount - obj.history[hist];
                      //       }
                      //     }
                      //     agent.add(sum + " recovered");
                      //   }
                      // }
                      // for (let obj of result.deaths.locations) {
                      //   if (obj.country === acountry.name) {
                      //     let sum = 0;
                      //     let latestCount = obj.latest;
                      //     for (let hist in obj.history) {
                      //       let sDate = new Date(hist);
                      //       if (sDate.getTime() == mDate.getTime()) {
                      //         sum = latestCount - obj.history[hist];
                      //       }
                      //     }
                      //     agent.add(sum + " deaths");
                      //   }
                      // }
                      agent.add("default case hit");
                      break;
                  }
                }
                agent.add(" cases");
              }
            })
            .catch((error) => {
              console.log(error);
            });
        }
      }
    }
    // Run the proper function handler based on the matched Dialogflow intent name
    let intentMap = new Map();
    intentMap.set("Default Welcome Intent", welcome);
    intentMap.set("Default Fallback Intent", fallback);
    intentMap.set("Worldwide Latest Stats", worldWideStats);
    intentMap.set("Location Latest Stats", locationLatestStats);
    intentMap.set("Location Date Specific", locationDateSpecific);
    // intentMap.set('your intent name here', yourFunctionHandler);
    // intentMap.set('your intent name here', googleAssistantHandler);
    agent.handleRequest(intentMap);
  }
);
