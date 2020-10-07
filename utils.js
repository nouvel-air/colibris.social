const departments = require('./departments.json');
const countries = {
  FR: 'France',
  BE: 'Belgique',
  CH: 'Suisse',
  CA: 'Canada'
};

const convertWikiNames = str =>
  str
    .substring(0, 36)
    .replace(/([a-zA-Z])(?=[A-Z])/g, '$1-')
    .toLowerCase();

const convertWikiDate = str => str && str.replace(' ', 'T');

const getSlugFromUri = str => str.replace(/\/$/, '').replace(/.*\//, '');

const getCountryName = code => code && countries[code];

const getDepartmentName = zip => {
  if (zip) {
    const departmentNumber = zip.toString().slice(0, 2);
    const department = departments.find(d => {
      console.log(typeof d.num_dep, typeof departmentNumber);
      return d.num_dep == departmentNumber;
    });
    console.log('department', department);
    if (department) return department.dep_name;
  }
};

module.exports = {
  convertWikiNames,
  convertWikiDate,
  getSlugFromUri,
  getCountryName,
  getDepartmentName
};
