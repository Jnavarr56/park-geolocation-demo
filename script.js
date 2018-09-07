let militaryToMeridian = (time) => {
    let colon = time.indexOf(":");
    let hours = eval(time.slice(0, colon));
    let mins = eval(time.slice(colon + 1));
    let merid = "am";
    if (hours === 0) {
        hours = 12;
    }
    else if (hours === 24) {
        hours = 12;
    }
    else if (hours > 12) {
        merid = "pm";
        hours -= 12;
    }
    if (mins < 60) {
        mins = `0${mins}`;
    }
    return `${hours}:${mins}${merid}`;
}
let militaryToSeconds = (time) => {
    let colon = time.indexOf(":");
    let hours = eval(time.slice(0, colon)) * 3600;
    let mins = eval(time.slice(colon + 1)) * 60;
    return hours + mins;
}
let checkSpans = (span, seconds) => {
    if (seconds >= span.split("-")[0] && seconds <= span.split("-")[1]) {
        return true;
    }
    else {
        return false;
    }
}
let getCoords = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) =>{
            userDataFromLocation["lat"] = position.coords.latitude;
            userDataFromLocation["lon"] = position.coords.longitude;
            getAddressFromCoords(position.coords.latitude, position.coords.longitude);
        });
    } else {
        console.log("Not supported");
    }
}
let getAddressFromCoords = (latitude, longitude) => {
    axios.get(`https://api.geocod.io/v1.3/reverse?q=${latitude},${longitude}&api_key=${geocodioAPIKey}`)
    .then((response) => {
        console.log(response);
        getRulesFromCoords();
    })
    .catch((error) => {
        console.log(error);
    });
}

//`https://api.coord.co/v1/search/curbs/bylocation/all_rules?latitude=${userDataFromLocation["lat"]}&longitude=${userDataFromLocation["lon"]}&radius_km=0.025&temp_rules_window_start=&temp_rules_window_end=&primary_use=&permitted_use=park&vehicle_type=all&access_key=${coordcoAPIKEY}`


let getRulesFromCoords = () => {
    axios.get(`https://api.coord.co/v1/search/curbs/bylocation/all_rules?latitude=${userDataFromLocation["lat"]}&longitude=${userDataFromLocation["lon"]}&radius_km=0.05&temp_rules_window_start=&temp_rules_window_end=&primary_use=park&permitted_use=park&vehicle_type=all&access_key=${coordcoAPIKEY}`)
    .then((response) => {
        console.log(response);
        let mapOptions = {center: new google.maps.LatLng(userDataFromLocation["lat"], userDataFromLocation["lon"]),
            zoom: 18,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        };
        let map = new google.maps.Map(document.getElementById("map_canvas"),mapOptions);
        let allCurbs = [];
        for (let x = 0; x < response.data.features.length; x++) {
            let blockWholeLine = [];
            for (let y = 0; y < response.data.features[x].geometry.coordinates.length; y ++) {
                blockWholeLine.push({lat: response.data.features[x].geometry.coordinates[y][1], lng: response.data.features[x].geometry.coordinates[y][0]});
            }
            let blockWhole = new google.maps.Polyline({
                path: blockWholeLine,
                geodesic: true,
                strokeColor: "#FF0000",
                strokeOpacity: 1.0,
                strokeWeight: 5
            });
            allCurbs.push(blockWhole);
            blockWhole.addListener("click", ()=>{
                console.log("-----------------------------------------------------");
                console.log("-----------------------------------------------------");
                console.log("-----------------------------------------------------");
                console.log("-----------------------------------------------------");
                blockWhole.strokeColor = "#00ff00";
                blockWhole.setOptions({strokeColor: "#00ff00"});
                for (let c = 0; c < allCurbs.length; c++) {
                    if (allCurbs[c] !== blockWhole) {
                        allCurbs[c].strokeColor = "#FF0000";
                        allCurbs[c].setOptions({strokeColor: "#FF0000"});
                    }
                }
                let rightNowObj = new Date();
                let rightNowSeconds = militaryToSeconds(`${rightNowObj.getHours()}:${rightNowObj.getMinutes()}`);
                //console.log(`NOW ${rightNow.getHours()}:${rightNow.getMinutes()}`);
                console.log(`NOW ${rightNowSeconds}`);
    
                for (let z = 0; z < response.data.features[x].properties.rules.length; z++) {
                    if (response.data.features[x].properties.rules[z].primary === "park" || response.data.features[x].properties.rules[z].permitted.includes("park")) {
                        console.log(`BLOCK PARKING RULE #${(z+1)}/${response.data.features[x].properties.rules.length}:`)
                        let rule = response.data.features[x].properties.rules[z];
                        console.log(rule);
                        let ruleTimes = response.data.features[x].properties.rules[z].times;
                        let daysInDayOfWeeks = [];
                        for (let a = 0; a < ruleTimes.length; a++) {
                            for (let b = 0; b < ruleTimes[a].days.length; b++) {
                                //AS REAL TIME daysInDayOfWeeks.push({daysAsInts: ruleTimes[a].days[b], daysAsWeekday: daysOfWeek[ruleTimes[a].days[b]], span: `${militaryToMeridian(ruleTimes[a].time_of_day_start)}-${militaryToMeridian(ruleTimes[a].time_of_day_end)}`});
                                /*AS MILITARY TIME*/ daysInDayOfWeeks.push({daysAsInts: ruleTimes[a].days[b], daysAsWeekday: daysOfWeek[ruleTimes[a].days[b]], span: `${ruleTimes[a].time_of_day_start}-${ruleTimes[a].time_of_day_end}`});
                                //AS MINUTES:
                                //daysInDayOfWeeks.push({daysAsInts: ruleTimes[a].days[b], daysAsWeekday: daysOfWeek[ruleTimes[a].days[b]], span: `${militaryToSeconds(ruleTimes[a].time_of_day_start)}-${militaryToSeconds(ruleTimes[a].time_of_day_end)}`});
                            }
                        }
                        
                        let spansInWeek  = {paid: {status: false, rate: null}, daysWithSpans: {"Su": [], "M": [], "T": [], "W": [], "Thr": [], "F": [], "Sa": []}};
                        
                        for (let a = 0; a < daysInDayOfWeeks.length; a++) {
                            for (let b in spansInWeek.daysWithSpans) {
                                if (daysInDayOfWeeks[a].daysAsWeekday === b) {
                                    spansInWeek.daysWithSpans[b].push(daysInDayOfWeeks[a].span);
                                }
                            }
                        }

                        if (rule.price[0].price_per_hour.amount !== 0) {
                            spansInWeek.paid.status = true;
                            spansInWeek.paid.rate = rule.price[0].price_per_hour.amount;
                        }

                        
                        /*let checkDayIndex = daysOfWeek.indexOf(daysOfWeek[rightNowObj.getDay()]);

                        let daysCheckedArray = [];

                        let daysChecked = 0;
                        while (daysChecked !== daysOfWeek.length - 1) {

                            daysCheckedArray.push({dayChecked: daysOfWeek[checkDayIndex], checkedSpans: spansInWeek.daysWithSpans[daysOfWeek[checkDayIndex]]});
                            

                            checkDayIndex++;
                            if (checkDayIndex === daysOfWeek.length - 1) {
                                checkDayIndex = 0;
                            }
                            daysChecked ++;
                        }*/
                        //console.log(daysCheckedArray);


                        console.log(spansInWeek);

                    }
                }
                console.log("-----------------------------------------------------");
                console.log("-----------------------------------------------------");
                console.log("-----------------------------------------------------");
                console.log("-----------------------------------------------------");
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
let monthsOfYear = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];


getCoords();

