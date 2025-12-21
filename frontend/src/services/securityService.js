import axios from "axios";

export const updatePassword = async (data, token) => {
  const response = await axios.put(
    "${process.env.REACT_APP_API_URL}/api/users/me/password",
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};
