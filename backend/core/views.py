from django.http import JsonResponse
from .models import VideoPreset

def latest_video(request):
    video = VideoPreset.objects.order_by('-created_at').first()
    if video:
        return JsonResponse({'name': video.name, 'youtube_url': video.youtube_url})
    return JsonResponse({'error': 'No videos found'}, status=404)