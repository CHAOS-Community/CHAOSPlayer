var client = new PortalClient("http://api.chaos-systems.com");
client.SessionCreate();

client.SessionCreated.Add(function () { client.GetObjectByGUID(ClientGetObjectByGUIDCallback, "8bcdba56-bd51-480e-83d0-48b0094c6688"); });

$(document).ready(function (event)
{


});

function ClientGetObjectByGUIDCallback(succes, data)
{
	jwplayer("PlayerContainer").setup(
		{
			flashplayer: "/jwplayer/player.swf",
			file: "/uploads/video.mp4",
			height: "100%",
			width: "100%"
		});
}