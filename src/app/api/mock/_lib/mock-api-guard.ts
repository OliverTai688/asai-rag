export function blockMockApiInProduction(): Response | null {
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  if (process.env.ALLOW_MOCK_API === "true") {
    return null;
  }

  return Response.json(
    {
      error: "mock_api_disabled",
      message: "Mock API routes are disabled in production.",
    },
    { status: 404 },
  );
}
