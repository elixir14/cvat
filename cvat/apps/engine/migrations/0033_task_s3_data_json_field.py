# Generated by Django 3.1.1 on 2020-11-24 13:22

import django.contrib.postgres.fields.jsonb
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('engine', '0032_remove_task_z_order'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='s3_data',
            field=django.contrib.postgres.fields.jsonb.JSONField(null=True),
        ),
    ]