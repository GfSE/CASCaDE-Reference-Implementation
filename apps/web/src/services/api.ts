export async function getHelloMessage() {
  const response = await fetch("http://localhost:4000/api/hello");

  if (!response.ok) {
    throw new Error("API request failed");
  }

  return response.json();
}