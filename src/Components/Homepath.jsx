// where "Home" should go: the dashboard if logged in, the login page if not
export const getHomePath = () => {
  try {
    return sessionStorage.getItem("kinvest_auth") === "true" ? "/homeprofile" : "/";
  } catch {
    return "/";
  }
};