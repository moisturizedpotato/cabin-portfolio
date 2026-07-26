from django.contrib import admin
from django.urls import path
from core.views import latest_video

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/latest-video/', latest_video),
]