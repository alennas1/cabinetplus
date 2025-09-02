import axios from "axios";

export const updatePassword = async (data, token) => {
  const response = await axios.put(
    "http://localhost:8080/api/users/me/password",
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};
