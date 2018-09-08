//Madeline's Apartment: 40.665724, -73.994812
//Farther down from her place: 40.663834, -73.992977

//TIME CONVERSION FUNCTIONS-----------------------------------
let militaryToMeridian = (time) => {
    let colon = time.indexOf(":");
    let hours = eval(time.slice(0, colon));
    let mins = eval(time.slice(colon + 1));
    let merid = "am";
    if (hours === 0) {hours = 12;}
    else if (hours === 24) {hours = 12;}
    else if (hours > 12) {merid = "pm";hours -= 12;}
    if (mins < 10) {mins = `0${mins}`;}
    return `${hours}:${mins}${merid}`;
}
let militaryToSeconds = (time) => {
    let colon = time.indexOf(":");
    let hours = eval(time.slice(0, colon)) * 3600;
    let mins = eval(time.slice(colon + 1)) * 60;
    return hours + mins;
}
//------------------------------------------------------------

//CHECKS TO SEE IF CURB CURRENTLY NEEDS PAYMENT---------------
let isNotCurrentlyPaid = (curbObj) => {
    let currentDay = (new Date()).getDay();
    let currentTimeAsMins = militaryToSeconds(`${(new Date()).getHours()}:${(new Date()).getMinutes()}`);
    let ans = false;
    for (let i = 0; i < curbObj.properties.rules.length; i++) {
        for (let o = 0; o < curbObj.properties.rules[i].times.length; o++) {
            if ((curbObj.properties.rules[i].times[o].days.includes(currentDay) && (currentTimeAsMins >= militaryToSeconds(curbObj.properties.rules[i].times[o].time_of_day_start) &&  currentTimeAsMins <= militaryToSeconds(curbObj.properties.rules[i].times[o].time_of_day_end))) && curbObj.properties.rules[i].price[0].price_per_hour.amount === 0) {
                return true;
            }
        }
    }
    return ans;
}
//------------------------------------------------------------


//CHECKS TO SEE IF PARKING SPANS ARE CONTIGUOUS---------------
let isContiguous = (lastLowerBound, currentUpperBound) => {
    if (lastLowerBound === "24:00") {lastLowerBound = "00:00";}
    if (lastLowerBound === currentUpperBound) {return true;}
    else {return false;}
}
//------------------------------------------------------------


//CHECKS TO SEE WHEN WE CAN'T PARK ANYMORE--------------------
let findMoveByDatetime = (ruleObj) => {
    let workingRuleObj = ruleObj; //<--avoid manipulating global data

    
    let rightNowObj = new Date();
    let rightNowMilitary = `${rightNowObj.getHours()}:${rightNowObj.getMinutes()}`; 
    let rightNowSeconds = militaryToSeconds(`${rightNowObj.getHours()}:${rightNowObj.getMinutes() < 10 ?  "0" + rightNowObj.getMinutes().toString() : rightNowObj.getMinutes()}`);
    let todayDayKey = daysOfWeek[rightNowObj.getDay()];
    let todayDayIndex = daysOfWeek.indexOf(daysOfWeek[rightNowObj.getDay()]);


    let startKey;
    let startRange;
    let found = false;
    for (let t in workingRuleObj.daysWithSpans) {
        if (t === todayDayKey) {
            for (let s = 0; s < workingRuleObj.daysWithSpans[t].length; s++) {
                let checkSpan = {upperBound: militaryToSeconds(workingRuleObj.daysWithSpans[t][s].split("-")[0]), lowerBound: militaryToSeconds(workingRuleObj.daysWithSpans[t][s].split("-")[1])};
                /*console.log("checking...");
                console.log(t);
                console.log(rightNowSeconds);
                console.log(checkSpan);*/
                if (rightNowSeconds >= checkSpan.upperBound && rightNowSeconds <= checkSpan.lowerBound) {
                    found = true;
                    startKey = t;
                    startRange = s;
                    console.log("Found Allowed Current Range!")
                    console.log(`Today: ${t} Current Time: ${rightNowSeconds} Current Range: ${checkSpan.upperBound}-${checkSpan.lowerBound}`);
                    console.log(`Today: ${t} Current Time: ${rightNowMilitary} Current Range: ${workingRuleObj.daysWithSpans[t][s].split("-")[0]}-${workingRuleObj.daysWithSpans[t][s].split("-")[1]}`);
                    break;
                }
            }
        }
    }
    if (found === false) {
        //alert("This is a free parking area but you can't park here right now.");
    } 
    else {
        let daysChecked = 0;
        let dayOfWeekIndex = daysOfWeek.indexOf(startKey);
        let rangesChecked = [];
        while (daysChecked < daysOfWeek.length) {

            let rangeIndex;
            if (daysChecked === 0) {
                rangeIndex = startRange;
            }
            else {
                rangeIndex = 0;
            }

            console.log("--------");
            console.log(daysOfWeek[dayOfWeekIndex]);

            let moveByObj = false;
            //{day: daysOfWeek[dayOfWeekIndex], maximumHour: workingRuleObj.daysWithSpans[daysOfWeek[dayOfWeekIndex]][r]};     
            for (let r = rangeIndex; r < workingRuleObj.daysWithSpans[daysOfWeek[dayOfWeekIndex]].length; r++) {
                rangesChecked.push({day: daysOfWeek[dayOfWeekIndex], range: workingRuleObj.daysWithSpans[daysOfWeek[dayOfWeekIndex]][r]});
                if (rangesChecked.length === 1) {                    
                    console.log(`First Range Checked: ${rangesChecked[rangesChecked.length-1].range}`);
                }
                else if (rangesChecked.length > 1){
        
                    if (!isContiguous(rangesChecked[rangesChecked.length-2].range.split("-")[1], rangesChecked[rangesChecked.length-1].range.split("-")[0])) {
                        console.log("gap found");
                        console.log(`Current Checked Range: ${rangesChecked[rangesChecked.length-1].range}`);
                        return rangesChecked[rangesChecked.length-2];
                    }

                    console.log(`Current Checked Range: ${rangesChecked[rangesChecked.length-1].range}`);
                }
            }


            console.log("--------");
            
            


            daysChecked++;
            dayOfWeekIndex++;
            if (dayOfWeekIndex === daysOfWeek.length) {
                dayOfWeekIndex = 0;
            }
        }
    }




}
//------------------------------------------------------------

//MASTER FUNCTION, GETS LAT/LNG-------------------------------***
let getCoords = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) =>{
            userDataFromLocation["lat"] = position.coords.latitude;
            userDataFromLocation["lon"] = position.coords.longitude;
            getRulesFromCoords();
        });
    } else {
        console.log("Not supported");
    }
}
//------------------------------------------------------------


let getRulesFromCoords = () => {
    axios.get(`https://api.coord.co/v1/search/curbs/bylocation/all_rules?latitude=${userDataFromLocation["lat"]}&longitude=${userDataFromLocation["lon"]}&radius_km=0.05&temp_rules_window_start=&temp_rules_window_end=&primary_use=park&permitted_use=park&vehicle_type=all&access_key=${coordcoAPIKEY}`)
    .then((response) => {
        console.log(response);
    
        //CREATE MAP, ADD USER POS ICON AND RADIUS--------------------------------------------------------------------------
        let map = new google.maps.Map(document.getElementById("map_canvas"), {
            center: {
                lat: userDataFromLocation["lat"], 
                lng: userDataFromLocation["lon"]
            },
            zoom: 18,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        });
        let userMarker = new google.maps.Marker({
            map: map,
            position: {
                lat: userDataFromLocation["lat"], 
                lng: userDataFromLocation["lon"]
            },
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10
            },
            title: "User Position"
        });
        let userRadius = new google.maps.Circle({
            map: map,
            radius: 50,    
            fillColor: "#9999ff",
            strokeColor: "#0000e6",
            strokeWeight: .5,
        });
        userRadius.bindTo("center", userMarker, "position");
        //------------------------------------------------------------------------------------------------------------------

        let allCurbs = []; //<--- hold all valid curb objects
        //LOOPING THROUGH ALL CURBS-----------------------------------------------------------------------------------------------------------------------------
        for (let x = 0; x < response.data.features.length; x++) { 

            //LOOP THROUGH CURB'S START & END COORDS AND CREATE A LINE OBJ FOR IT IF THAT COORD OBJ IS VALID----------------
            let blockWholeLine = [];
            for (let y = 0; y < response.data.features[x].geometry.coordinates.length; y ++) {
                if (isNotCurrentlyPaid(response.data.features[x])) {
                    blockWholeLine.push({lat: response.data.features[x].geometry.coordinates[y][1], lng: response.data.features[x].geometry.coordinates[y][0]});
                }
            }
            let blockWhole = new google.maps.Polyline({
                path: blockWholeLine,
                geodesic: true,
                strokeColor: "#0066cc",
                strokeOpacity: 1.0,
                strokeWeight: 7,
                zIndex: 1
            });
            allCurbs.push(blockWhole);
            //--------------------------------------------------------------------------------------------------------------

            //CREATE EVENT CLICK LISTENER FOR EACH LINE---------------------------------------------------------------------
            blockWhole.addListener("click", ()=>{
                let moveByFinal;
                console.log("-----------------------------------------------------");
                console.log("-----------------------------------------------------");

                //CHANGE CLICKED LINE COLOR TO GREEN AND OTHERS TO RED------------------------------------------------------
                blockWhole.strokeColor = "#00ff00";
                blockWhole.setOptions({strokeColor: "#00ff00"});
                for (let c = 0; c < allCurbs.length; c++) {
                    if (allCurbs[c] !== blockWhole) {
                        allCurbs[c].strokeColor = "#FF0000";
                        allCurbs[c].setOptions({strokeColor: "#FF0000"});
                    }
                }
                //----------------------------------------------------------------------------------------------------------
            
        
                master:
                for (let z = 0; z < response.data.features[x].properties.rules.length; z++) {
                    if (response.data.features[x].properties.rules[z].primary === "park" || response.data.features[x].properties.rules[z].permitted.includes("park")) {
                        console.log(`RELEVANT CURB PARKING RULE #${(z+1)} OUT OF ${response.data.features[x].properties.rules.length} IN TOTAL:----`);

                        //CONVERT TIME PROPERTIES FOR EACH DAY INTO SINGLE OBJECT (A) WITH A RANGE
                        let daysInDayOfWeeks = [];
                        let ruleTimes = response.data.features[x].properties.rules[z].times;
                        for (let a = 0; a < ruleTimes.length; a++) {
                            for (let b = 0; b < ruleTimes[a].days.length; b++) {
                                /*AS REAL TIME*/ //daysInDayOfWeeks.push({daysAsInts: ruleTimes[a].days[b], daysAsWeekday: daysOfWeek[ruleTimes[a].days[b]], span: `${militaryToMeridian(ruleTimes[a].time_of_day_start)}-${militaryToMeridian(ruleTimes[a].time_of_day_end)}`});
                                /*AS MILITARY TIME*/ daysInDayOfWeeks.push({daysAsInts: ruleTimes[a].days[b], daysAsWeekday: daysOfWeek[ruleTimes[a].days[b]], span: `${ruleTimes[a].time_of_day_start}-${ruleTimes[a].time_of_day_end}`});
                                /*AS SECONDS:*/ //daysInDayOfWeeks.push({daysAsInts: ruleTimes[a].days[b], daysAsWeekday: daysOfWeek[ruleTimes[a].days[b]], span: `${militaryToSeconds(ruleTimes[a].time_of_day_start)}-${militaryToSeconds(ruleTimes[a].time_of_day_end)}`});
                            }
                        }
                        
                        //SORT (A) OBJECTS' RANGE PROPERTIES INTO ANOTHER OBJECT (B) REPERESENTING ENTIRE WEEK BASED ON THEIR DAYS
                        let spansInWeek  = {paid: {status: false, rate: null}, daysWithSpans: {"Su": [], "M": [], "T": [], "W": [], "Thr": [], "F": [], "Sa": []}, otherInfo: response.data.features[x].properties.metadata};
                        for (let a = 0; a < daysInDayOfWeeks.length; a++) {
                            for (let b in spansInWeek.daysWithSpans) {
                                if (daysInDayOfWeeks[a].daysAsWeekday === b) {
                                    spansInWeek.daysWithSpans[b].push(daysInDayOfWeeks[a].span);
                                }
                            }
                        }
                        for (let c in spansInWeek.daysWithSpans) {
                            spansInWeek.daysWithSpans[c].sort();
                        }

                        //GIVE (B) A PROPERTY WITH INFO REGARDING PAYMENT DATA JUST IN CASE
                        if (response.data.features[x].properties.rules[z].price[0].price_per_hour.amount !== 0) {
                            spansInWeek.paid.status = true;
                            spansInWeek.paid.rate = response.data.features[x].properties.rules[z].price[0].price_per_hour.amount;
                        }

                        console.log("Rule with MetaData and Day Spans:");
                        console.log(spansInWeek);

                        //console.log(findMoveByDatetime(spansInWeek));
                        moveByFinal = findMoveByDatetime(spansInWeek);
                        if (moveByFinal !== undefined) {
                            moveByFinal.curbCoords = {start: {lat: response.data.features[x].geometry.coordinates[0][1], lng: response.data.features[x].geometry.coordinates[0][0]}, end: {lat: response.data.features[x].geometry.coordinates[1][1], lng: response.data.features[x].geometry.coordinates[1][0]}};
                            moveByFinal.profile = spansInWeek;
                        }
                    }
                }
                console.log("-----------------------------------------------------");
                console.log("-----------------------------------------------------");

                console.log(moveByFinal)
                if (moveByFinal !== undefined) {
                    document.getElementById("display").innerText = `You must move the car by ${militaryToMeridian(moveByFinal.range.split("-")[1])} on ${moveByFinal.day}.`;
                }
                else {
                    document.getElementById("display").innerText = "You do not have to move the car this week.";
                }
            });
            blockWhole.setMap(map);
        }  
    })
    .catch((error) => {
        console.log(error);
    });
}



let userDataFromLocation = {};
let geocodioAPIKey = "e2b570b6bbfb2e7b0b0044b25f05eb7989b0794";
let coordcoAPIKEY = "5r5gSXX5MxG4qx3xB9DvgIPP3Rrjuwx2VWUGE-LYbIA";
let daysOfWeek = ["Su", "M", "T", "W", "Thr", "F", "Sa"];
let dates = ["", "", "", "", "", "", ""]
let monthsOfYear = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];


getCoords();
























//NOT USING YET----------------------------------------------------------------------------------------
let getAddressFromCoords = (latitude, longitude) => {
    axios.get(`https://api.geocod.io/v1.3/reverse?q=${latitude},${longitude}&api_key=${geocodioAPIKey}`)
    .then((response) => {
        console.log(response);
        
    })
    .catch((error) => {
        console.log(error);
    });
}
//-----------------------------------------------------------------------------------------------------