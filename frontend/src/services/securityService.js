import axios from "axios";

export const updatePassword = async (data, token) => {
  const response = await axios.put(
    "https://cabinetplus-production.up.railway.app/api/users/me/password",
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};
