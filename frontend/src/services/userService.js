import { userApi } from './api/user.api.js';

export async function fetchCurrentUserProfile() {
  return userApi.getAuthMeUser();
}

export async function fetchMyProfile() {
  return userApi.getMe();
}

export async function patchMyProfile(body) {
  return userApi.patchMe(body);
}

export async function uploadMyProfilePicture(imageFile) {
  return userApi.uploadProfilePicture(imageFile);
}

export async function changeMyPassword(body) {
  return userApi.changeMyPassword(body);
}
