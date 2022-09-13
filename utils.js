const createSlug = require('speakingurl');
const departments = require('./config/departments.json');
const { ACTOR_TYPES } = require("@semapps/activitypub");

const capitalize = s => (s && s[0].toUpperCase() + s.slice(1)) || "";

const getSlugFromUri = str => str.replace(/\/$/, '').replace(/.*\//, '');

const getDepartmentName = zip => {
  if (zip) {
    const departmentNumber = zip.toString().slice(0, 2);
    const department = departments.find(d => d.num_dep.toString() === departmentNumber);
    if (department) return department.dep_name;
  }
};

const slugify = label => createSlug(label.trim(), { lang: 'fr', custom: { '.': '.', 'Ǧ': 'g' } });

// Taken from https://stackoverflow.com/a/21623206/7900695
const distanceBetweenPoints = (lat1, lon1, lat2, lon2) => {
  const p = 0.017453292519943295; // Math.PI / 180
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p) / 2 + (c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))) / 2;
  return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
};

const addDays = (date, days) => {
  let result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const removeTime = dateTime => new Date(dateTime.toDateString());

const frenchAddressReverseSearch = async (lat, lon) => {
  const url = new URL('https://api-adresse.data.gouv.fr/reverse/');
  url.searchParams.set('lat', lat);
  url.searchParams.set('lon', lon);
  const response = await fetch(url.toString());

  if (response.ok) {
    const json = await response.json();
    return json.features.length > 0 ? json.features[0] : false;
  } else {
    return false;
  }
};

const selectActorData = resource => {
  let resourceId = resource.id || resource['@id'],
    resourceTypes = resource.type || resource['@type'];
  resourceTypes = Array.isArray(resourceTypes) ? resourceTypes : [resourceTypes];
  if (resourceTypes.includes('foaf:Person')) {
    return {
      '@type': ACTOR_TYPES.PERSON,
      name: (resource['foaf:name'] && resource['foaf:familyName']) ? resource['foaf:name'] + ' ' + resource['foaf:familyName'] : undefined,
      preferredUsername: getSlugFromUri(resourceId)
    };
  } else if (resourceTypes.includes('pair:Organization')) {
    return {
      '@type': ACTOR_TYPES.ORGANIZATION,
      name: resource['pair:label'],
      preferredUsername: getSlugFromUri(resourceId)
    };
  } else if (resourceTypes.includes('pair:Group')) {
    return {
      type: ACTOR_TYPES.GROUP,
      name: resource['pair:label'],
      preferredUsername: getSlugFromUri(resourceId)
    };
  } else {
    return false;
  }
};

module.exports = {
  capitalize,
  getSlugFromUri,
  getDepartmentName,
  slugify,
  distanceBetweenPoints,
  addDays,
  removeTime,
  frenchAddressReverseSearch,
  selectActorData
};
