import json
import uuid
from rest_framework import renderers


class JSONErrorRenderer(renderers.JSONRenderer):
    charset = 'utf-8'

    @staticmethod
    def _json_default(value):
        if isinstance(value, uuid.UUID):
            return str(value)
        raise TypeError(f'Object of type {type(value).__name__} is not JSON serializable')

    def render(self, data, accepted_media_type=None, renderer_context=None):
        if 'ErrorDetail' in str(data):
            return json.dumps({'errors': data}, default=self._json_default)
        else:
            return json.dumps(data, default=self._json_default)