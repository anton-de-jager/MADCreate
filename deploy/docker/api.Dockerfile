FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY apps/api/MADCreate.Api.csproj apps/api/
RUN dotnet restore apps/api/MADCreate.Api.csproj
COPY apps/api apps/api
RUN dotnet publish apps/api/MADCreate.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "MADCreate.Api.dll"]
