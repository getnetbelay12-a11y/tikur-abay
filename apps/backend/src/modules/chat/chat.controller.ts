import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { Permissions } from '../auth/permissions.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { ChatService } from './chat.service';

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('rooms')
  @Permissions('chat:view', 'chat:own:view')
  rooms(
    @CurrentUser() user: AuthenticatedUser,
    @Query('shipmentId') shipmentId?: string,
    @Query('roomType') roomType?: string,
  ) {
    return this.chatService.rooms(user, { shipmentId, roomType });
  }

  @Post('rooms/resolve')
  @Permissions('chat:view', 'chat:send', 'chat:own:view')
  resolveRoom(
    @Body() body: { shipmentId?: string; roomType?: string; roleRoute?: string; title?: string; participantRoles?: string[]; participantIds?: string[] },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chatService.resolveRoom(body, user);
  }

  @Get('rooms/:id/messages')
  @Permissions('chat:view', 'chat:own:view')
  messages(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
    @Query('q') q?: string,
    @Query('messageType') messageType?: string,
  ) {
    return this.chatService.messages(id, user, { limit, before, q, messageType });
  }

  @Get('rooms/:id/search')
  @Permissions('chat:view', 'chat:own:view')
  search(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Query('q') q?: string) {
    return this.chatService.search(id, user, q);
  }

  @Post('rooms/:id/messages')
  @Permissions('chat:send', 'chat:own:view')
  sendMessage(
    @Param('id') id: string,
    @Body() body: { text?: string; content?: string; messageType?: 'text' | 'file' | 'system' | 'alert'; attachments?: any[]; replyToMessageId?: string; pinned?: boolean },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chatService.sendMessage(id, body, user);
  }

  @Post('rooms/:id/read')
  @Permissions('chat:view', 'chat:own:view')
  markRead(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.chatService.markRead(id, user);
  }
}
